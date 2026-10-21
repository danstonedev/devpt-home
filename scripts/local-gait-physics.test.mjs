import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createLocalGaitPhysics } from './local-gait-physics.mjs';

const packet={schemaVersion:1,actor:'blank-canvas',frames:[{tMs:0},{tMs:100}],totalMs:100};
async function fixture(run) {
 const directory=await mkdtemp(resolve(tmpdir(),'devpt-physics-service-test-'));
 const runner=resolve(directory,'runner.mjs');
 await writeFile(runner,`import {readFileSync,writeFileSync} from 'node:fs';const input=JSON.parse(readFileSync(process.argv[process.argv.indexOf('--input')+1],'utf8'));setTimeout(()=>writeFileSync(process.argv[process.argv.indexOf('--output')+1],JSON.stringify({schemaVersion:1,testFixture:true,actor:input.actor,nonce:Math.random()})),100);`);
 const server=createServer(createLocalGaitPhysics({runner}));await new Promise(accept=>server.listen(0,'127.0.0.1',accept));
 const url=`http://127.0.0.1:${server.address().port}`;
 const post=(body=packet,origin='http://127.0.0.1:8110')=>fetch(url,{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
 try {await run({url,post});}finally{await new Promise(accept=>server.close(accept));await rm(directory,{recursive:true,force:true});}
}
test('local simulation service rejects unsupported methods, origins and recording bounds',()=>fixture(async({url,post})=>{
 assert.equal((await fetch(url)).status,405);
 assert.equal((await post(packet,'https://example.test')).status,403);
 assert.equal((await post({...packet,actor:'james'})).status,400);
 assert.equal((await post({...packet,totalMs:Infinity})).status,400);
 assert.equal((await post({...packet,frames:[]})).status,400);
}));
test('runs only its fixed CLI and reuses exact recording results',()=>fixture(async({post})=>{
 const first=await post();assert.equal(first.status,200);const one=await first.json();
 assert.equal(one.testFixture,true);assert.equal(one.actor,'blank-canvas');
 const second=await post();assert.deepEqual(await second.json(),one);
 const changed=await post({...packet,actor:'blank-female'});assert.equal(changed.status,200);assert.equal((await changed.json()).actor,'blank-female');
}));
test('concurrent submissions cannot launch overlapping simulations',()=>fixture(async({post})=>{
 const results=await Promise.all([post(),post({...packet,actor:'blank-female'})]);
 assert.deepEqual(results.map(result=>result.status).sort(),[200,409]);
 for(const result of results)await result.json();
 assert.equal((await post({...packet,totalMs:101})).status,200);
}));
