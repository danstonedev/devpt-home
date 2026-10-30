/* Public navigation data only. Canonical resource eligibility stays source-owned. */
(function(root){
  'use strict';
  const ID=/^[a-z0-9][a-z0-9-]{0,159}$/;
  const MAX_ITEMS=4096,MAX_BYTES=512*1024,MAX_TOKEN=100000;
  function view(value){
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['resource','side','cohort','practice'].includes(key))||!ID.test(value.resource||'')||!['R','L'].includes(value.side)||!['male','female'].includes(value.cohort)||value.practice!==undefined&&!ID.test(value.practice))throw new Error('Invalid saved anatomy view.');
    return{resource:value.resource,side:value.side,cohort:value.cohort,...(value.practice?{practice:value.practice}:{})};
  }
  function items(value){
    if(!Array.isArray(value)||value.length>MAX_ITEMS)throw new Error('This collection has too many resources for one link.');
    return value.map(item=>{
      if(typeof item==='string'&&ID.test(item))return{id:item};
      if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(key=>!['id','view'].includes(key))||!ID.test(item.id||''))throw new Error('Invalid collection resource.');
      return{id:item.id,...(item.view?{view:view(item.view)}:{})};
    });
  }
  async function bytes(stream,limit=MAX_BYTES){
    const reader=stream.getReader(),chunks=[];let size=0;
    try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>limit){await reader.cancel().catch(()=>{});throw new Error('This collection is too large for one link.');}chunks.push(next.value);}}
    finally{reader.releaseLock();}
    const output=new Uint8Array(size);let offset=0;for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.byteLength;}return output;
  }
  function base64(data){let text='';for(let i=0;i<data.length;i+=16384)text+=String.fromCharCode(...data.subarray(i,i+16384));return btoa(text).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
  function unbase64(text){if(!text||text.length>MAX_TOKEN||!/^[A-Za-z0-9_-]+$/.test(text))throw new Error('Invalid collection link.');try{return Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}catch{throw new Error('Invalid collection link.');}}
  async function encodeCollection(value){
    const raw=new TextEncoder().encode(JSON.stringify({v:1,items:items(value)}));
    if(raw.byteLength>MAX_BYTES)throw new Error('This collection is too large for one link.');
    const compressed=typeof root.CompressionStream==='function';
    const data=compressed?await bytes(new Blob([raw]).stream().pipeThrough(new root.CompressionStream('deflate'))):raw;
    const token=(compressed?'d1.':'j1.')+base64(data);
    if(token.length>MAX_TOKEN)throw new Error('This collection is too large for one link.');
    return token;
  }
  async function decodeCollection(token){
    if(typeof token!=='string'||token.length>MAX_TOKEN||!/^([dj]1)\./.test(token))throw new Error('Invalid collection link.');
    const compressed=token.startsWith('d1.'),data=unbase64(token.slice(3));
    if(compressed&&typeof root.DecompressionStream!=='function')throw new Error('Open this compact collection in a current browser.');
    const raw=compressed?await bytes(new Blob([data]).stream().pipeThrough(new root.DecompressionStream('deflate'))):data;
    if(raw.byteLength>MAX_BYTES)throw new Error('This collection is too large for one link.');
    let payload;try{payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{throw new Error('Invalid collection link.');}
    if(!payload||payload.v!==1||Object.keys(payload).some(key=>!['v','items'].includes(key)))throw new Error('Invalid collection link.');
    return items(payload.items);
  }
  root.DevptNavigation=Object.freeze({view,items,encodeCollection,decodeCollection});
})(globalThis);
