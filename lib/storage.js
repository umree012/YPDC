import {put,list,get} from '@vercel/blob';
import {mkdir,writeFile,readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
export const localMode=()=>!process.env.VERCEL&&Boolean(process.env.LOCAL_DATA_DIR);
const prefix='ypdc/applications/';
export async function saveRecord(key,record){
  if(localMode()){await mkdir(process.env.LOCAL_DATA_DIR,{recursive:true});try{await writeFile(join(process.env.LOCAL_DATA_DIR,key+'.json'),JSON.stringify(record),{flag:'wx'});return true;}catch(e){if(e.code==='EEXIST')return false;throw e;}}
  try{await put(prefix+key+'.json',JSON.stringify(record),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json',token:process.env.BLOB_READ_WRITE_TOKEN});return true;}catch(e){const existing=await get(prefix+key+'.json',{access:'private',useCache:false,token:process.env.BLOB_READ_WRITE_TOKEN});if(existing?.statusCode===200){await existing.stream?.cancel();return false;}throw e;}
}
async function paths(){let cursor;const blobs=[];do{const result=await list({prefix,cursor,limit:1000,token:process.env.BLOB_READ_WRITE_TOKEN});blobs.push(...result.blobs);cursor=result.hasMore?result.cursor:undefined;}while(cursor);return blobs;}
export async function listRecords(){
  if(localMode()){await mkdir(process.env.LOCAL_DATA_DIR,{recursive:true});const names=(await readdir(process.env.LOCAL_DATA_DIR)).filter(x=>x.endsWith('.json'));return Promise.all(names.map(async name=>JSON.parse(await readFile(join(process.env.LOCAL_DATA_DIR,name),'utf8'))));}
  const blobs=await paths(),records=[];
  for(let i=0;i<blobs.length;i+=20){const batch=await Promise.all(blobs.slice(i,i+20).map(async blob=>{const result=await get(blob.pathname,{access:'private',useCache:false,token:process.env.BLOB_READ_WRITE_TOKEN});if(!result||result.statusCode!==200)throw new Error('Unable to read application');return JSON.parse(await new Response(result.stream).text());}));records.push(...batch);}
  return records;
}
export async function countRecords(){return localMode()?(await listRecords()).length:(await paths()).length;}
