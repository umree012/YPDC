import http from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {randomBytes} from 'node:crypto';
import handler from './api/index.js';
if(process.env.VERCEL)throw new Error('Use Vercel Functions in production.');
try{process.loadEnvFile('.env');}catch{}
if(!process.env.BLOB_READ_WRITE_TOKEN){
  process.env.LOCAL_DATA_DIR=resolve('.data/applications');
  await mkdir('.data',{recursive:true});
  let secrets;try{secrets=JSON.parse(await readFile('.data/local-admin.json','utf8'));}catch{secrets={password:randomBytes(18).toString('base64url'),secret:randomBytes(32).toString('hex')};await writeFile('.data/local-admin.json',JSON.stringify(secrets,null,2));}
  process.env.ADMIN_PASSWORD ||= secrets.password;process.env.SESSION_SECRET ||= secrets.secret;
  console.log('Local preview only. Admin password is in .data/local-admin.json. Applications stay on this device.');
}
const root=resolve('public');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 try{const path=new URL(req.url,'http://localhost').pathname;
  if(path.startsWith('/api/')){if(req.method==='POST'){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>25000){res.writeHead(413);res.end();return;}chunks.push(chunk);}req.body=Buffer.concat(chunks).toString();}return handler(req,res);}
  const file=resolve(root,'.'+decodeURIComponent(path==='/'?'/index.html':path));
  if(!file.startsWith(root+sep)||!(await stat(file)).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(Number(process.env.PORT||5173),'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:'+server.address().port));
