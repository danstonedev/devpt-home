import {test,expect} from '@playwright/test';

// Host protocol/failure fixtures. Actual layered model continuity is verified in simLAB.
const origin='https://lab.devpt.app';
const resource=(id,title,initial='ankle:posterior-glide',extra={})=>({id,nativeId:id,title,region:'Ankle & foot',regionId:'ankle-foot',topic:'Manual therapy',topicId:'manual-therapy',type:'Teaching resource',level:'BETA',media:'anatomy',symbol:'book',desc:'Public protocol fixture',outcome:'Navigation',source:'Source owned',minutes:0,launch:{kind:'joint',initial,...extra}});
const workspace=resource('anatomy-explorer','Anatomy explorer','shoulder:flexion',{workspace:'whole-body',workspaceRegions:['ankle','hip','knee','shoulder'],mode:'full-range',rest:true});
const entries=Array.from({length:80},(_,i)=>resource('joint-ankle-posterior-glide-very-long-public-resource-identifier-'+i,'Ankle glide '+i));
const catalog={schemaVersion:1,status:'public-resources',activities:[workspace,resource('joint-ankle-posterior-glide','Posterior talar glide'),resource('anatomy-hip','Hip anatomy','hip:flexion',{rest:true}),resource('atlas-whole-body','Whole-body 3D anatomy','hip:flexion',{kind:'anatomy'}),...entries]};
const source=`<!doctype html><p>Protocol fixture</p><script>const target=new URL(document.referrer).origin;addEventListener('message',e=>{if(e.origin===target&&e.source===parent&&e.data?.type==='devpt-teaching-select')parent.postMessage({type:'devpt-teaching-ready',activity:e.data.activity},target)});parent.postMessage({type:'devpt-teaching-ready',activity:new URLSearchParams(location.search).get('activity')},target)</script>`;
async function setup(page,{failed=false}={}){await page.route(origin+'/teaching/catalog.json',r=>r.fulfill({json:catalog}));await page.route(u=>u.origin===origin&&u.pathname==='/teaching/',r=>r.fulfill({contentType:'text/html',body:failed?'<!doctype html><p>Unavailable source fixture</p>':source}));}
async function settle(page){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function open(page,testInfo){await page.goto('/#/activity/anatomy-explorer?view=joint-ankle-posterior-glide&side=L&cohort=female');await expect(page.locator('.native-player')).toHaveAttribute('data-ready','true');if(testInfo.project.name==='phone')await page.goBack();}

for(const count of [35,61])test(`complete ${count}-item collection with long IDs opens in a clean browser`,async({page,browser},info)=>{
 await setup(page);await page.addInitScript(ids=>localStorage.setItem('devpt.saved-resources.v1',JSON.stringify(ids)),entries.slice(0,count).map(x=>x.id));
 await page.goto('/#/saved');await expect(page.locator('.ref-result')).toHaveCount(count);await page.locator('.page-head [data-share-saved]').click();
 const url=await page.getByLabel('Resource share link',{exact:true}).inputValue();expect(new URL(url).hash).toMatch(/^#\/saved\?set=d1\./);
 const ctx=await browser.newContext({viewport:info.project.use.viewport});try{const receiver=await ctx.newPage();await setup(receiver);await receiver.goto(url);await expect(receiver.locator('.ref-result')).toHaveCount(count);await expect(receiver.locator('.ref-result strong')).toHaveText(entries.slice(0,count).map(x=>x.title));}finally{await ctx.close();}
});
test('legacy collections over 50 are preserved; malformed and missing IDs are explicit',async({page})=>{
 await setup(page);await page.goto('/#/saved?ids='+entries.slice(0,61).map(x=>x.id).join(','));await expect(page.locator('.ref-result')).toHaveCount(61);
 await page.goto('/#/saved?set=d1.bad');await expect(page.getByRole('alert')).toContainText('invalid');await expect(page.locator('main')).not.toContainText('Keep useful');
 await page.goto('/#/saved?ids=removed-public-resource,joint-ankle-posterior-glide');await expect(page.locator('main')).toContainText('1 resources are not available');await expect(page.locator('main')).toContainText('removed-public-resource');
});
test('saved anatomy captures side/cohort and survives sharing and Save all',async({page,browser},info)=>{
 await setup(page);await open(page,info);await page.getByRole('button',{name:'Save current view',exact:true}).click();await expect(page.getByRole('button',{name:'Remove saved view',exact:true})).toBeVisible();
 await page.goto('/#/saved');await expect(page.locator('.saved-view-note')).toHaveText('Saved view · Left · Female');
 const href=await page.locator('.ref-result a').getAttribute('href');expect(href).toContain('side=L&cohort=female');await page.locator('.page-head [data-share-saved]').click();const url=await page.getByLabel('Resource share link',{exact:true}).inputValue();
 const ctx=await browser.newContext();try{const other=await ctx.newPage();await setup(other);await other.goto(url);await expect(other.locator('.saved-view-note')).toHaveText('Saved view · Left · Female');await other.getByRole('button',{name:'More saved-resource actions',exact:true}).click();await other.getByRole('button',{name:'Save all',exact:true}).click();await other.goto(new URL('/#/saved',url).href);await expect(other.locator('.ref-result a')).toHaveAttribute('href',href);await other.locator('.ref-result a').click();await expect(other.locator('.native-frame')).toHaveAttribute('src',/view=joint-ankle-posterior-glide&side=L&cohort=female$/);}finally{await ctx.close();}
});
test('saved view update replaces settings instead of removing the resource',async({page},info)=>{
 await setup(page);await open(page,info);await page.getByRole('button',{name:'Save current view',exact:true}).click();await page.evaluate(()=>{const frame=document.querySelector('iframe');dispatchEvent(new MessageEvent('message',{origin:new URL(frame.src).origin,source:frame.contentWindow,data:{type:'devpt-teaching-view',activity:'anatomy-explorer',view:{resource:'joint-ankle-posterior-glide',side:'R',cohort:'male'}}}));});
 await page.getByRole('button',{name:'Update saved view',exact:true}).click();await page.goto('/#/saved');await expect(page.locator('.ref-result')).toHaveCount(1);await expect(page.locator('.saved-view-note')).toHaveText('Saved view · Right · Male');
});
test('a shared view cannot substitute another resource; re-sharing retains missing IDs',async({page})=>{
 await setup(page);await page.goto('/#/saved');
 const entries=[{id:'joint-ankle-posterior-glide',view:{resource:'anatomy-hip',side:'L',cohort:'female'}},{id:'retired-public-resource'}];
 const token=await page.evaluate(values=>DevptNavigation.encodeCollection(values),entries);
 await page.goto('/#/saved?set='+token);await expect(page.locator('main')).toContainText('1 saved views are no longer supported');await expect(page.locator('.ref-result a')).toHaveAttribute('href','#/activity/joint-ankle-posterior-glide');
 await page.locator('.page-head [data-share-saved]').click();const url=await page.getByLabel('Resource share link',{exact:true}).inputValue();const received=await page.evaluate(url=>DevptNavigation.decodeCollection(new URLSearchParams(new URL(url).hash.split('?')[1]).get('set')),url);expect(received).toEqual(entries);
});
test('a delayed catalog preserves list restoration rather than replacing it with loading-state scroll',async({page})=>{
 await setup(page);await page.goto('/#/library?q=glide');const link=page.locator('.ref-result a').nth(65);await link.scrollIntoViewIfNeeded();await settle(page);const before=await page.evaluate(()=>scrollY);
 await page.route(origin+'/teaching/catalog.json',async r=>{await new Promise(resolve=>setTimeout(resolve,300));await r.fulfill({json:catalog});});
 await page.reload();await expect(page.locator('.ref-result')).toHaveCount(81);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before-50);
});
test('search URL, refresh, Back, expanded results and scroll preserve context',async({page},info)=>{
 await setup(page);await page.goto('/#/library?q=Ankle');await page.getByRole('searchbox',{name:'Search resources',exact:true}).fill('Ankle glide');await page.getByLabel('Filter by region').selectOption('ankle-foot');await expect(page).toHaveURL(/q=Ankle\+glide&region=ankle-foot/);await page.reload();await expect(page.getByRole('searchbox',{name:'Search resources',exact:true})).toHaveValue('Ankle glide');
 const link=page.locator('.ref-result a').nth(70);await link.scrollIntoViewIfNeeded();await link.focus();await settle(page);const y=await page.evaluate(()=>scrollY);await link.click();await expect(page.locator('.native-player')).toHaveAttribute('data-ready','true');if(info.project.name==='phone')await page.goBack();await page.goBack();await expect(page.getByRole('searchbox',{name:'Search resources',exact:true})).toHaveValue('Ankle glide');await expect(page.getByLabel('Filter by region')).toHaveValue('ankle-foot');await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(y-50);
});
test('regional filter and expanded group survive visiting a resource',async({page},info)=>{
 await setup(page);await page.goto('/#/region/ankle-foot');await page.locator('[data-filter-page]').fill('glide');await page.locator('.ref-list a:visible').first().click();await expect(page.locator('.native-player')).toHaveAttribute('data-ready','true');if(info.project.name==='phone')await page.goBack();await page.goBack();await expect(page.locator('[data-filter-page]')).toHaveValue('glide');
});
test('workspace header follows actual context; Share restores focus after source update',async({page},info)=>{
 await setup(page);await open(page,info);await expect(page.locator('.breadcrumb')).toContainText('Ankle & foot');await expect(page.locator('.breadcrumb')).toContainText('Manual therapy');await expect(page.locator('.page-band [data-switch]')).toHaveCount(0);
 await page.locator('[data-share-resource]').click();await page.evaluate(()=>{const f=document.querySelector('.native-frame');dispatchEvent(new MessageEvent('message',{origin:new URL(f.src).origin,source:f.contentWindow,data:{type:'devpt-teaching-view',activity:'anatomy-explorer',view:{resource:'anatomy-hip',side:'L',cohort:'female'}}}));});await page.getByRole('button',{name:'Close dialog',exact:true}).click();await settle(page);await expect(page.locator('[data-share-resource]')).toBeFocused();
 await page.goto('/#/library?q=Whole-body');await expect(page.locator('.ref-result strong')).toHaveText('Whole-body 3D anatomy');
});
test('Back and Forward replay fullscreen without phantom navigation',async({page},info)=>{
 test.skip(info.project.name!=='phone','Phone app fullscreen history');await setup(page);await page.goto('/#/activity/anatomy-explorer?view=anatomy-hip');await expect(page.locator('.native-player')).toHaveClass(/fullscreen/);await page.goBack();await expect(page.locator('.native-player')).not.toHaveClass(/fullscreen/);await page.goForward();await expect(page.locator('.native-player')).toHaveClass(/fullscreen/);await page.goBack();await expect(page.locator('.native-player')).not.toHaveClass(/fullscreen/);
});
test('failed source retains visible host recovery over mobile iframe and Retry replaces it',async({page},info)=>{
 await setup(page,{failed:true});await page.clock.install();await page.goto('/#/activity/anatomy-explorer?view=anatomy-hip');await page.clock.fastForward(25010);await expect(page.locator('.native-recovery')).toBeVisible();await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Open full view',exact:true})).toHaveAttribute('href',/activity=anatomy-explorer/);await page.locator('.native-frame').evaluate(el=>el.dataset.beforeRetry='yes');await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.locator('[data-before-retry]')).toHaveCount(0);if(info.project.name==='phone'){await expect(page.getByRole('button',{name:'Back to page',exact:true})).toBeVisible();await page.getByRole('button',{name:'Back to page',exact:true}).click();await expect(page.locator('.native-player')).not.toHaveClass(/fullscreen/);}
});
test('mobile menu dismisses with Escape and outside click',async({page},info)=>{
 test.skip(info.project.name!=='phone','Mobile primary menu');await setup(page);await page.goto('/#/regions');await page.locator('[data-menu]').click();await page.keyboard.press('Escape');await expect(page.locator('[data-menu]')).toHaveAttribute('aria-expanded','false');await expect(page.locator('[data-menu]')).toBeFocused();await page.locator('[data-menu]').click();await page.locator('main').click({position:{x:8,y:350}});await expect(page.locator('[data-menu]')).toHaveAttribute('aria-expanded','false');
});
test('unknown top-level routes show recovery and never pretend to be Home',async({page})=>{
 await setup(page);await page.goto('/#/definitely-not-a-page');await expect(page.getByRole('heading',{name:'Page not found',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Search the library',exact:true})).toBeVisible();
});
test('tablet shell keeps content inside viewport',async({page})=>{
 await setup(page);for(const width of [768,1024]){await page.setViewportSize({width,height:900});for(const route of ['regions','topics','library?q=knee','saved','faculty','contact']){await page.goto('/#/'+route);await page.locator('main h1').waitFor();await settle(page);const data=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1&&el.getBoundingClientRect().width>0).slice(0,12).map(el=>({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right}))}));expect(data,JSON.stringify(data)).toMatchObject({scroll:width});}}
});
