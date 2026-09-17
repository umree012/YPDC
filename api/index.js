import {createHash,createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {validate} from '../lib/schema.js';
import {makeExcel,makePDF} from '../lib/exports.js';
import {localMode,saveRecord,listRecords,countRecords} from '../lib/storage.js';
const hash = value => createHash('sha256').update(value).digest();
const equal = (a,b) => timingSafeEqual(hash(a),hash(b));
const ready = () => Boolean((localMode() || process.env.BLOB_READ_WRITE_TOKEN) && process.env.ADMIN_PASSWORD?.length>=12 && process.env.SESSION_SECRET?.length>=32);
const signature = payload => createHmac('sha256',process.env.SESSION_SECRET).update(payload).digest('hex');
function authenticated(req){
  const token=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('ypdc_session='))?.slice(13);
  if(!token)return false;const [payload,sig]=token.split('.');if(!payload||!sig||!equal(signature(payload),sig))return false;
  try{const data=JSON.parse(Buffer.from(payload,'base64url').toString());return data.expires>Date.now()&&equal(data.version,hash(process.env.ADMIN_PASSWORD).toString('hex'));}catch{return false;}
}
function cookie(value,age){return `ypdc_session=${value}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${age}${process.env.VERCEL?' ; Secure':''}`;}
// Basic per-instance throttling. Vercel Firewall can add deployment-wide limits.
const attempts = new Map();
async function rateLimit(req,kind,limit){
  const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  const now=Date.now();
  for(const [key,item] of attempts)if(item.expires<now)attempts.delete(key);
  const key=kind+':'+hash(ip).toString('hex');
  if(!attempts.has(key)){if(attempts.size>=10000)return false;attempts.set(key,{count:0,expires:now+600000});}
  return ++attempts.get(key).count<=limit;
}
function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const url=new URL(req.url,'http://localhost');const path=url.pathname;
  try{
    if(path==='/api/config' && req.method==='GET')return json(res,200,{ready:ready(),open:ready()&&process.env.RECRUITMENT_OPEN!=='false'});
    if(!ready())return json(res,503,{error:'Recruitment is not configured yet. Please contact the society team.'});
    if(req.method==='POST'){
      const origin=req.headers.origin;
      if(!origin||new URL(origin).host!==req.headers.host)return json(res,403,{error:'Please submit from this website.'});
      if(!String(req.headers['content-type']).startsWith('application/json'))return json(res,415,{error:'JSON is required.'});
      if(typeof req.body==='string'){if(Buffer.byteLength(req.body)>25000)return json(res,413,{error:'Application is too large.'});try{req.body=JSON.parse(req.body);}catch{return json(res,400,{error:'Invalid request.'});}}
      if(!req.body||Buffer.byteLength(JSON.stringify(req.body))>25000)return json(res,400,{error:'Invalid request.'});
    }
    if(path==='/api/applications' && req.method==='POST'){
      if(process.env.RECRUITMENT_OPEN==='false')return json(res,403,{error:'Recruitment is currently closed.'});
      if(req.body.website)return json(res,400,{error:'Unable to accept this application.'});
      if(!await rateLimit(req,'apply',10))return json(res,429,{error:'Too many attempts. Please try again in 10 minutes.'});
      let data;try{data=validate(req.body);}catch(error){return json(res,400,{error:error.message});}
      const record={id:randomUUID(),submittedAt:new Date().toISOString(),...data};
      const key=hash(`${data.university.toLowerCase()}|${data.registrationId.toLowerCase()}`).toString('hex');
      // A fixed opaque pathname and no-overwrite write prevent duplicate records.
      const saved=await saveRecord(key,record);
      if(!saved)return json(res,409,{error:'An application with this university and registration ID already exists. Contact the team for changes.'});
      return json(res,201,{id:record.id});
    }
    if(path==='/api/admin/login' && req.method==='POST'){
      if(!await rateLimit(req,'login',8))return json(res,429,{error:'Too many login attempts. Try again in 10 minutes.'});
      if(typeof req.body.password!=='string'||!equal(req.body.password,process.env.ADMIN_PASSWORD))return json(res,401,{error:'Incorrect password.'});
      const payload=Buffer.from(JSON.stringify({expires:Date.now()+3600000,version:hash(process.env.ADMIN_PASSWORD).toString('hex'),nonce:randomUUID()})).toString('base64url');
      res.setHeader('Set-Cookie',cookie(`${payload}.${signature(payload)}`,3600));return json(res,200,{ok:true});
    }
    if(path==='/api/admin/logout' && req.method==='POST'){res.setHeader('Set-Cookie',cookie('',0));return json(res,200,{ok:true});}
    if(path.startsWith('/api/admin/')){
      if(!authenticated(req))return json(res,401,{error:'Sign in to access recruitment applications.'});
      if(path==='/api/admin/session'&&req.method==='GET')return json(res,200,{ok:true,count:await countRecords()});
      if(path==='/api/admin/export'&&req.method==='GET'){
        const format=url.searchParams.get('format');if(!['pdf','xlsx'].includes(format))return json(res,400,{error:'Choose PDF or Excel.'});
        const records=(await listRecords()).sort((a,b)=>a.submittedAt.localeCompare(b.submittedAt));
        const file=format==='pdf'?await makePDF(records):await makeExcel(records);
        res.setHeader('Content-Type',format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition',`attachment; filename="YPDC-applications.${format}"`);res.statusCode=200;return res.end(file);
      }
    }
    return json(res,404,{error:'Not found.'});
  }catch{return json(res,503,{error:'The recruitment service is temporarily unavailable. Please try again shortly.'});}
}
