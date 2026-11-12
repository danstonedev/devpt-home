import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import routes from '../library-routes.js';
import { buildPublicSite } from './build-public-site.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const catalog = JSON.parse(readFileSync(join(root, 'e2e/fixtures/public-catalog.json'), 'utf8'));

test('public routes round-trip and do not accept arbitrary paths or resource IDs', () => {
  for (const [route, path] of [['home','/'],['region/hip','/regions/hip/'],['topic/special-tests','/topics/special-tests/'],['section/examination','/sections/examination/'],['activity/exam-special-lachman','/resources/exam-special-lachman/'],['library','/search/'],['saved','/saved/']]) {
    assert.equal(routes.href(route), path); assert.equal(routes.fromPath(path), route);
  }
  assert.equal(routes.href('activity/../private'), null);
  assert.equal(routes.fromPath('/unknown/'), null);
  assert.equal(routes.fromPath('/resources/hip/extra/'), null);
  for (const id of ['../private','%65xamination','examination/extra']) assert.equal(routes.href('section/'+id), null);
  assert.equal(routes.fromPath('/sections/%65xamination/'), null);
});

test('the public export contains readable canonical pages and a catalog-derived sitemap', () => {
  const output = mkdtempSync(join(tmpdir(), 'devpt-seo-test-'));
  try {
    const result = buildPublicSite({ catalog, output });
    assert.equal(result.resources, 5);
    const read = name => readFileSync(join(output, name), 'utf8');
    const resource = read('resources/exam-special-lachman/index.html');
    assert.match(resource, /<h1>Lachman test<\/h1>/);
    assert.match(resource, /<link rel="canonical" href="https:\/\/devpt.app\/resources\/exam-special-lachman\/"/);
    assert.match(resource, /<title>Lachman test · DevPT<\/title>/);
    assert.match(resource, /LearningResource/);
    assert.match(resource, /Source-owned fixture/);
    assert.doesNotMatch(resource, /<iframe\b/);
    assert.doesNotMatch(resource, /href="#\//);
    const sitemap = read('sitemap.xml');
    assert.match(sitemap, /\/regions\/hip\//);
    assert.match(sitemap, /\/resources\/anatomy-hip\//);
    assert.doesNotMatch(sitemap, /\/search\/|\/saved\/|\/resources\/hip-anatomy\/|#/);
    assert.match(read('saved/index.html'), /noindex, follow/);
    assert.match(read('search/index.html'), /noindex, follow/);
    assert.match(read('sitemap.html'), /\/resources\/exam-special-lachman\//);
    const config = JSON.parse(read('staticwebapp.config.json'));
    assert.deepEqual(config.routes.find(rule => rule.route === '/resources/hip-anatomy/'), {route:'/resources/hip-anatomy/',redirect:'/resources/anatomy-hip/',statusCode:301});
    assert.equal(config.navigationFallback, undefined);
    for (const file of ['node_modules','docs','e2e','local-site-config.js','catalog.json','scripts']) assert.equal(existsSync(join(output,file)), false);
  } finally { rmSync(output, { recursive: true, force: true }); }
});

test('nonempty source-owned sections export canonical pages in source order without indexing private routes', () => {
  const output = mkdtempSync(join(tmpdir(), 'devpt-section-test-'));
  const sectioned = {...catalog,
    sections:[{id:'examination',label:'Examination'},{id:'structure-function',label:'Structure & function'},{id:'unused',label:'Unused section'}],
    topics:catalog.topics.map(topic=>({...topic,sectionId:topic.id==='anatomy'?'structure-function':'examination'})),
  };
  try {
    buildPublicSite({catalog:sectioned,output});
    const read=name=>readFileSync(join(output,name),'utf8');
    const section=read('sections/examination/index.html');
    assert.match(section,/<h1>Examination<\/h1>/);
    assert.match(section,/<link rel="canonical" href="https:\/\/devpt.app\/sections\/examination\/"/);
    assert.match(section,/CollectionPage/);
    const data=JSON.parse(section.match(/<script type="application\/json" id="library-page-data">([\s\S]*?)<\/script>/)[1]);
    assert.equal(data.page_type,'section');assert.equal(data.section_id,'examination');assert.equal(data.content_group,'library');
    assert.equal(data.noindex,false);
    const sitemap=read('sitemap.xml');
    assert.ok(sitemap.indexOf('/sections/examination/')<sitemap.indexOf('/sections/structure-function/'));
    const indexedUrls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
    assert.doesNotMatch(indexedUrls.join('\n'),/\/sections\/unused\/|\/search\/|\/saved\/|\?|#/);
    assert.equal(existsSync(join(output,'sections/unused/index.html')),false);
    assert.match(read('saved/index.html'),/noindex, follow/);
    assert.match(read('search/index.html'),/noindex, follow/);
  } finally { rmSync(output,{recursive:true,force:true}); }
});

test('unpublished and malformed source data cannot produce a release', () => {
  const output = mkdtempSync(join(tmpdir(), 'devpt-invalid-test-'));
  try {
    for (const invalid of [
      {...catalog,status:'local-development-only'},
      {...catalog,activities:[...catalog.activities,catalog.activities[0]]},
      {...catalog,activities:catalog.activities.map((item,index)=>index?item:{...item,url:'https://evil.example/teaching/'})},
      {...catalog,sections:'not-a-section-list'},
      {...catalog,sections:[{id:'examination',label:'Examination'},{id:'examination',label:'Duplicate'}]},
      {...catalog,sections:[{id:'../private',label:'Not public'}]},
      {...catalog,sections:[{id:'examination',label:''}]},
    ]) assert.throws(() => buildPublicSite({catalog:invalid,output}));
  } finally { rmSync(output, { recursive: true, force: true }); }
});

function analytics(hostname = 'devpt.app', {path='/search/?q=private+email@example.com&ids=secret&utm_source=newsletter&utm_medium=email',app=false,pageInfo=null} = {}) {
  const listeners = {}, scripts = [];
  const window = {};
  runInNewContext(readFileSync(join(root, 'site-analytics.js'), 'utf8'), {
    window, location: new URL('https://' + hostname + path), URL, URLSearchParams, Date,
    document: { readyState:'loading', title:'Public information', referrer:'https://example.org/a?private=secret', head:{append(script){scripts.push(script);}}, createElement(){return {};}, addEventListener(name,fn){listeners[name]=fn;},
      getElementById(id){return id==='app'&&app?{}:id==='library-page-data'&&pageInfo?{textContent:JSON.stringify(pageInfo)}:null;} },
  });
  return { api:window.DEVPT_ANALYTICS, scripts, calls:()=>Array.from(window.dataLayer||[], args=>Array.from(args)), click:listeners.click, ready:()=>listeners.DOMContentLoaded(), hasLayer:()=>Object.hasOwn(window,'dataLayer') };
}
const home = { canonical:'https://devpt.app/',title:'Reference library',content_group:'library',page_type:'homepage' };

test('analytics emits one initial view, separates resource use and deduplicates re-renders/readiness', () => {
  const {api,scripts,calls}=analytics();
  api.page(home);api.page(home);
  const resource={...home,canonical:'https://devpt.app/resources/anatomy-hip/',title:'Hip anatomy',page_type:'resource',resource_id:'anatomy-hip',region_id:'hip',topic_id:'anatomy'};
  api.page(resource);api.page(resource);
  api.track('resource_ready',resource);api.track('resource_ready',resource);
  api.page(home);
  const events=calls().filter(call=>call[0]==='event');
  assert.equal(scripts.length,1);
  assert.equal(scripts[0].src,'https://www.googletagmanager.com/gtag/js?id=G-61473CPT29');
  const configurations=calls().filter(call=>call[0]==='config');
  assert.equal(configurations.length,1);
  assert.equal(configurations[0][1],'G-61473CPT29');
  assert.ok(events.every(call=>call[2].send_to==='G-61473CPT29'));
  assert.doesNotMatch(JSON.stringify(calls()),/G-VTLNJW0KKX/);
  assert.equal(events.filter(call=>call[1]==='page_view').length,3);
  assert.equal(events.filter(call=>call[1]==='resource_open').length,1);
  assert.equal(events.filter(call=>call[1]==='resource_ready').length,1);
  assert.equal(events.find(call=>call[2].page_type==='resource')[2].page_referrer,'https://devpt.app/');
  assert.equal(calls().find(call=>call[0]==='config')[2].send_page_view,false);
  assert.equal(calls().find(call=>call[0]==='config')[2].campaign_source,'newsletter');
});

test('analytics excludes raw input and is silent on previews and localhost', () => {
  const {api,calls}=analytics();api.page(home);
  api.track('library_search',{result_count:2,search_term:'private email@example.com',page_location:'https://evil.example',region_id:'hip'});
  api.track('resource_share',{resource_id:'bad?private=email@example.com',share_type:'link',url:'private'});
  const data=JSON.stringify(calls());
  assert.doesNotMatch(data,/email@example|private|secret|evil|search_term/);
  assert.match(data,/result_count/);
  for(const host of ['localhost','127.0.0.1','preview.azurestaticapps.net']){const preview=analytics(host);preview.api.page(home);assert.equal(preview.calls().length,0);assert.equal(preview.scripts.length,0);}
});

test('section analytics uses bounded identifiers on page views and feature events', () => {
  const {api,calls}=analytics();
  api.page({...home,canonical:'https://devpt.app/sections/examination/',page_type:'section',section_id:'examination'});
  api.track('library_search',{result_count:2});
  const events=calls().filter(call=>call[0]==='event');
  assert.equal(events.length,2);
  assert.ok(events.every(call=>call[2].section_id==='examination'));
  api.track('library_search',{section_id:123,result_count:2});
  assert.equal(calls().at(-1)[2].section_id,'examination');
  api.page({...home,canonical:'https://devpt.app/sections/structure-function/',page_type:'section',section_id:'bad?private=secret'});
  api.track('library_search',{section_id:'bad?private=secret',result_count:1});
  assert.ok(calls().filter(call=>call[0]==='event').slice(-2).every(call=>!Object.hasOwn(call[2],'section_id')));
  assert.doesNotMatch(JSON.stringify(calls()),/bad\?private|secret/);
});

test('page views and action context use the same bounded public identifiers', () => {
  const identifierKeys=['resource_id','region_id','topic_id','section_id'];
  const dimensions=params=>Object.fromEntries(identifierKeys.filter(key=>Object.hasOwn(params,key)).map(key=>[key,params[key]]));
  for(const entry of [
    {canonical:'https://devpt.app/regions/hip/',page_type:'region',ids:{region_id:'hip'}},
    {canonical:'https://devpt.app/topics/special-tests/',page_type:'topic',ids:{topic_id:'special-tests',section_id:'examination'}},
    {canonical:'https://devpt.app/sections/examination/',page_type:'section',ids:{section_id:'examination'}},
  ]){
    const {api,calls}=analytics();api.page({...home,...entry,...entry.ids});api.track('library_search',{result_count:1});
    const events=calls().filter(call=>call[0]==='event');
    assert.deepEqual(dimensions(events[0][2]),entry.ids);
    assert.deepEqual(dimensions(events[1][2]),entry.ids);
  }
  const {api,calls}=analytics();
  const malformed={region_id:{email:'private@example.test'},topic_id:'private@example.test',section_id:'examination?private=secret'};
  api.page({...home,canonical:'https://devpt.app/resources/anatomy-hip/',page_type:'resource',resource_id:'anatomy-hip',...malformed});
  api.track('resource_ready',{resource_id:'anatomy-hip',...malformed});
  const events=calls().filter(call=>call[0]==='event');
  assert.equal(events.length,3);
  for(const call of events)assert.deepEqual(dimensions(call[2]),{resource_id:'anatomy-hip'});
  assert.doesNotMatch(JSON.stringify(calls()),/private@example|private=secret/);
});

test('resource measurement requires a bounded identifier matching the canonical resource', () => {
  for(const resource_id of [undefined,123,{email:'private@example.test'},['anatomy-hip'],'private@example.test','anatomy-hip?private=secret','different-resource','a'.repeat(121)]){
    const {api,calls,scripts,hasLayer}=analytics();
    api.page({...home,canonical:'https://devpt.app/resources/anatomy-hip/',page_type:'resource',resource_id});
    api.track('resource_save',{resource_id:'anatomy-hip'});
    assert.equal(calls().length,0);assert.equal(scripts.length,0);assert.equal(hasLayer(),false);
  }
});

test('unknown, sensitive and encoded document paths cannot initialize public measurement', () => {
  for(const path of ['/api/health','/patient/fictional/','/patients/fictional/','/account/','/unknown.html','/resources/%61natomy-hip/','/resources/anatomy%2fhip/','/regions//hip/']){
    const {api,calls,scripts,ready,hasLayer}=analytics('devpt.app',{path});ready();api.page(home);api.track('inquiry_click');
    assert.equal(calls().length,0);assert.equal(scripts.length,0);assert.equal(hasLayer(),false);
  }
});

test('invalid public metadata clears the last safe measurement context', () => {
  const invalid=[
    {...home,canonical:'https://devpt.app/patient/fictional/'},
    {...home,canonical:'https://devpt.app/resources/../'},
    {...home,canonical:'https://devpt.app/resources/%61natomy-hip/',page_type:'resource'},
    {...home,canonical:'https://devpt.app/?private=secret'},
    {...home,canonical:'https://devpt.app/#private'},
    {...home,page_type:'private-fragment-value'},
    {...home,content_group:'private-group-value'},
    {...home,title:{untrusted:'not-a-public-title'}},
    {...home,canonical:'https://devpt.app/404.html',page_type:'unavailable'},
  ];
  for(const info of invalid){
    const rejected=typeof info.title==='string'?{...info,title:'Rejected title'}:info;
    const cold=analytics();cold.api.page(rejected);cold.api.track('inquiry_click');
    assert.equal(cold.calls().length,0);assert.equal(cold.scripts.length,0);assert.equal(cold.hasLayer(),false);
    const {api,calls,scripts}=analytics();api.page(home);const before=calls().length;
    api.page(rejected);api.track('resource_save',{resource_id:'anatomy-hip'});
    assert.equal(calls().length,before);assert.equal(scripts.length,1);
    assert.doesNotMatch(JSON.stringify(calls()),/Rejected title|private-fragment-value|private-group-value/);
    api.page(home);assert.equal(calls().filter(call=>call[0]==='event'&&call[1]==='page_view').length,2);
  }
});

test('product interest excludes native resource use and protected product paths', () => {
  const {api,calls,click}=analytics();
  api.page({...home,canonical:'https://devpt.app/resources/anatomy-hip/',page_type:'resource',resource_id:'anatomy-hip',region_id:'hip',topic_id:'anatomy'});
  const press=(href,direct=false)=>click({target:{closest:()=>({href,closest:()=>null,hasAttribute:name=>direct&&name==='data-player-direct'})}});
  press('https://devpt.app/emrs/');
  press('https://lab.devpt.app/showcase/');
  press('https://www.3dpain.app/');
  press('https://lab.devpt.app/teaching/?activity=anatomy-hip&view=private-query',true);
  press('https://lab.devpt.app/teaching/?activity=anatomy-hip');
  press('https://emr.devpt.app/api/patients?private-query');
  press('https://lab.devpt.app/protected/unknown?private-query');
  press('https://unrelated.example/showcase/');
  press('http://lab.devpt.app/');
  press('https://lab.devpt.app:1234/');
  const events=calls().filter(call=>call[0]==='event');
  assert.deepEqual(events.filter(call=>call[1]==='product_link_click').map(call=>call[2].product_id),['emrs','simlab','painmap']);
  const views=events.filter(call=>call[1]==='resource_full_view');
  assert.equal(views.length,1);assert.equal(views[0][2].resource_id,'anatomy-hip');
  assert.doesNotMatch(JSON.stringify(events),/private-query|api\/patients|unrelated|link_url/);
});

test('known static pages and generated library arrivals retain public measurement', () => {
  for(const path of ['/simlab/','/emrs/','/3dpain/','/privacy.html','/terms.html','/accessibility.html','/resource-credits.html','/sitemap.html']){
    const {calls,scripts,ready}=analytics('devpt.app',{path});ready();
    assert.equal(scripts.length,1);
    assert.equal(calls().filter(call=>call[0]==='event'&&call[1]==='page_view').length,1);
  }
  const {calls,scripts,ready}=analytics('devpt.app',{path:'/sections/examination/',app:true,pageInfo:{...home,canonical:'https://devpt.app/sections/examination/',page_type:'section',section_id:'examination'}});
  ready();assert.equal(scripts.length,1);
  assert.equal(calls().find(call=>call[0]==='event'&&call[1]==='page_view')[2].section_id,'examination');
});

test('explicit inquiry links with prepared text count without capturing their URL or resource reports', () => {
  const {api,calls,click}=analytics();api.page(home);
  const press=(href,inquiry=false)=>click({target:{closest:()=>({href,hasAttribute:name=>inquiry&&name==='data-inquiry'})}});
  press('mailto:owner@example.test');
  press('mailto:owner@example.test?subject=Walkthrough&body=private-prepared-text',true);
  press('mailto:owner@example.test?subject=Reference-report&body=private-report-text');
  press('https://example.test/?body=private-not-an-email',true);
  const events=calls().filter(call=>call[0]==='event'&&call[1]==='inquiry_click');
  assert.equal(events.length,2);
  assert.doesNotMatch(JSON.stringify(events),/mailto|owner@example|private|Walkthrough|Reference-report/);
});


test('generated arrivals are measured without a catalog, and redirects do not create phantom home views', () => {
  for (const hash of ['', '#main', '#/activity/anatomy-hip', '#/collection/all-hip', '#faculty', '#contact']) {
    const listeners={}, window={};
    runInNewContext(readFileSync(join(root,'site-analytics.js'),'utf8'), {
      window,location:new URL('https://devpt.app/'+hash),URL,URLSearchParams,Date,
      document:{readyState:'loading',referrer:'',head:{append(){}},createElement(){return {};},
        addEventListener(name,fn){listeners[name]=fn;},
        getElementById(id){return id==='app'?{}:id==='library-page-data'?{textContent:JSON.stringify(home)}:null;}},
    });
    listeners.DOMContentLoaded();
    const views=[...(window.dataLayer||[])].filter(args=>args[0]==='event'&&args[1]==='page_view');
    assert.equal(views.length,['','#main'].includes(hash)?1:0,hash);
  }
});
