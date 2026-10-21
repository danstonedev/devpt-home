import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

/** Loopback development service. It runs one fixed, source-owned CLI, with
 * bounded JSON in a private temporary directory. Never accepts executable paths. */
export function createLocalGaitPhysics({runner}) {
  let busy=false;
  const cache=new Map();
  const reply=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
  return async (req,res)=>{
    if(req.method!=='POST') {reply(res,405,{error:'Use the gait resource to start a simulation.'});return;}
    if(req.headers.origin && req.headers.origin!=='http://127.0.0.1:8110' && req.headers.origin!=='http://localhost:8110') {reply(res,403,{error:'Local preview origin required.'});return;}
    if(!req.headers['content-type']?.startsWith('application/json')) {reply(res,415,{error:'JSON recording required.'});return;}
    if(!existsSync(runner)) {reply(res,503,{error:'The local MuJoCo runtime has not been built. Run build:local-physics in the DevPT source checkout.'});return;}
    if(busy) {reply(res,409,{error:'A physics simulation is running. Try again when it finishes.'});return;}
    let directory,child,aborted=false,claimed=false;
    try {
      const chunks=[];let bytes=0;
      for await(const chunk of req) {bytes+=chunk.length;if(bytes>8*1024*1024){reply(res,413,{error:'Recording exceeds the local simulation limit.'});return;}chunks.push(chunk);}
      const text=Buffer.concat(chunks).toString('utf8');
      let packet;try {packet=JSON.parse(text);}catch{reply(res,400,{error:'Invalid recording JSON.'});return;}
      if(packet?.schemaVersion!==1 || !['blank-canvas','blank-female'].includes(packet.actor) || !Array.isArray(packet.frames) || packet.frames.length<2 || packet.frames.length>1801 || !Number.isFinite(packet.totalMs) || packet.totalMs<=0 || packet.totalMs>60000) {reply(res,400,{error:'A bounded native teaching-model recording is required.'});return;}
      const identity=createHash('sha256').update(text).update(await readFile(runner)).digest('hex');
      if(cache.has(identity)) {reply(res,200,cache.get(identity));return;}
      if(busy) {reply(res,409,{error:'A physics simulation is running. Try again when it finishes.'});return;}
      busy=true;claimed=true;
      directory=await mkdtemp(resolve(tmpdir(),'devpt-gait-'));
      const input=resolve(directory,'input.json'),output=resolve(directory,'output.json');
      await writeFile(input,text,{mode:0o600});
      await new Promise((accept,reject)=>{
        let stderr='';
        child=spawn(process.execPath,[runner,'--input',input,'--output',output],{stdio:['ignore','ignore','pipe']});
        child.stderr.on('data',chunk=>{if(stderr.length<4000)stderr+=chunk.toString();});
        const timeout=setTimeout(()=>{child.kill('SIGTERM');reject(new Error('The simulation exceeded its local time limit. Try a shorter native walk.'));},180000);
        const disconnect=()=>{if(!res.writableEnded){aborted=true;child.kill('SIGTERM');}};
        res.on('close',disconnect);
        child.once('error',error=>{clearTimeout(timeout);res.off('close',disconnect);reject(error);});
        child.once('exit',code=>{clearTimeout(timeout);res.off('close',disconnect);if(code===0)accept();else reject(new Error(stderr.trim() || 'The native physics trial stopped.'));});
      });
      if(aborted)return;
      const result=JSON.parse(await readFile(output,'utf8'));
      cache.set(identity,result);if(cache.size>3)cache.delete(cache.keys().next().value);
      reply(res,200,result);
    } catch(error) {if(!aborted && !res.writableEnded)reply(res,422,{error:error.message});}
    finally {if(claimed)busy=false;if(directory)await rm(directory,{recursive:true,force:true});}
  };
}
