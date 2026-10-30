import {test} from 'node:test';
import assert from 'node:assert/strict';
import '../assets/navigation-state.js';
const codec=globalThis.DevptNavigation;
test('a collection round-trips every resource and its order beyond the old 50-item display limit',async()=>{
  const values=Array.from({length:61},(_,i)=>({id:'resource-'+i}));
  assert.deepEqual(await codec.decodeCollection(await codec.encodeCollection(values)),values);
});
test('long authored-style identifiers and exact saved views survive a compact link',async()=>{
  const values=Array.from({length:35},(_,i)=>({id:'full-range-muscle-cervical-intertransverse-posterior-study-'+i,view:{resource:'full-range-muscle-cervical-intertransverse-posterior-study-'+i,side:'L',cohort:'female',practice:'match'}}));
  const token=await codec.encodeCollection(values);
  assert.ok(JSON.stringify(values).length>2000);assert.ok(token.length<2000);
  assert.deepEqual(await codec.decodeCollection(token),values);
});
test('source-sized collections retain all 1944 resource identifiers',async()=>{
  const values=Array.from({length:1944},(_,i)=>({id:'full-range-muscle-knee-reference-study-'+i}));
  assert.deepEqual(await codec.decodeCollection(await codec.encodeCollection(values)),values);
});
test('unsupported compression uses an uncompressed bounded compatible format',async()=>{
  const previous=globalThis.CompressionStream;globalThis.CompressionStream=undefined;
  try{const token=await codec.encodeCollection(['anatomy-hip']);assert.match(token,/^j1\./);assert.deepEqual(await codec.decodeCollection(token),[{id:'anatomy-hip'}]);}finally{globalThis.CompressionStream=previous;}
});
test('malformed links and unknown/private fields fail explicitly',async()=>{
  for(const token of ['','ids','d1.%%%%','j2.e30','j1.A'])await assert.rejects(codec.decodeCollection(token));
  assert.throws(()=>codec.items([{id:'anatomy-hip',caseId:'private'}]));
  assert.throws(()=>codec.items([{id:'anatomy-hip',view:{resource:'anatomy-hip',side:'L',cohort:'female',learner:'private'}}]));
  assert.throws(()=>codec.items([{id:'../secret'}]));
});
test('item and decoded-byte bounds remain enforced rather than truncating',async()=>{
  await assert.rejects(codec.encodeCollection(Array.from({length:4097},()=>({id:'anatomy-hip'}))),/too many/);
  const repeated=new TextEncoder().encode('x'.repeat(600000));
  const compressed=new Uint8Array(await new Response(new Blob([repeated]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  const token='d1.'+Buffer.from(compressed).toString('base64url');
  await assert.rejects(codec.decodeCollection(token),/too large/);
});
