import assert from 'node:assert/strict';

const base=process.env.DEVPT_LOCAL_BASE_URL || 'http://127.0.0.1:8110';
let checks=0;
for(const path of ['/','/simlab/','/emrs/','/3dpain/','/privacy.html','/terms.html','/accessibility.html','/sitemap.html','/apps.json','/native/teaching/?activity=gait','/native/showcase/?presentation=workspace&section=examine','/emr-native/?presentation=workspace&section=documentation']) {
  const result=await fetch(base+path,{method:'HEAD'});
  assert.equal(result.status,200,path);
  checks++;
}
for(const [path,type] of [['/teaching-library.js','text/javascript'],['/local-site-config.js','text/javascript'],['/teaching-library.css','text/css'],['/assets/devpt-logo.png','image/png']]) {
  const result=await fetch(base+path,{method:'HEAD'});
  assert.equal(result.status,200,path);
  assert.ok(result.headers.get('content-type').startsWith(type),path);
  checks++;
}
const emr=await fetch(base+'/emr-native/',{method:'HEAD'});
assert.ok(emr.headers.get('content-security-policy').includes("connect-src 'none'"));
assert.ok(!emr.headers.has('x-frame-options'));
const pacs=await fetch('http://127.0.0.1:5181/embed?embed=1',{method:'HEAD'});
assert.equal(pacs.status,200);
assert.ok(pacs.headers.get('content-type').startsWith('text/html'));
for(const path of ['/.git/HEAD','/.env','/scripts/package-local-site.mjs','/assets/%2e%2e/%2e%2e/.git/HEAD','/native/%2e%2e/%2e%2e/.git/HEAD']) {
  const result=await fetch(base+path);
  assert.ok([400,403,404].includes(result.status),path);
  checks++;
}
assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
console.log(`Local delivery passed: ${checks+4} page, prefix, MIME, isolation and boundary checks.`);
