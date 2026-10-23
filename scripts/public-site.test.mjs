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
  for (const [route, path] of [['home','/'],['region/hip','/regions/hip/'],['topic/special-tests','/topics/special-tests/'],['activity/exam-special-lachman','/resources/exam-special-lachman/'],['library','/search/'],['saved','/saved/']]) {
    assert.equal(routes.href(route), path); assert.equal(routes.fromPath(path), route);
  }
  assert.equal(routes.href('activity/../private'), null);
  assert.equal(routes.fromPath('/unknown/'), null);
  assert.equal(routes.fromPath('/resources/hip/extra/'), null);
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

test('unpublished and malformed source data cannot produce a release', () => {
  const output = mkdtempSync(join(tmpdir(), 'devpt-invalid-test-'));
  try {
    for (const invalid of [
      {...catalog,status:'local-development-only'},
      {...catalog,activities:[...catalog.activities,catalog.activities[0]]},
      {...catalog,activities:catalog.activities.map((item,index)=>index?item:{...item,url:'https://evil.example/teaching/'})},
    ]) assert.throws(() => buildPublicSite({catalog:invalid,output}));
  } finally { rmSync(output, { recursive: true, force: true }); }
});

function analytics(hostname = 'devpt.app') {
  const listeners = {}, scripts = [];
  const window = {};
  runInNewContext(readFileSync(join(root, 'site-analytics.js'), 'utf8'), {
    window, location: new URL('https://' + hostname + '/search/?q=private+email@example.com&ids=secret&utm_source=newsletter&utm_medium=email'), URL, URLSearchParams, Date,
    document: { readyState:'loading', referrer:'https://example.org/a?private=secret', head:{append(script){scripts.push(script);}}, createElement(){return {};}, addEventListener(name,fn){listeners[name]=fn;} },
  });
  return { api:window.DEVPT_ANALYTICS, scripts, calls:()=>Array.from(window.dataLayer||[], args=>Array.from(args)) };
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


test('generated arrivals are measured without a catalog, and redirects do not create phantom home views', () => {
  for (const hash of ['', '#main', '#/activity/anatomy-hip', '#faculty', '#contact']) {
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
