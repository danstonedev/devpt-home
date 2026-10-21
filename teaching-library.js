'use strict';
const ICONS = {
 arrow:'M5 12h14m-5-5 5 5-5 5', chevron:'m9 5 7 7-7 7', search:'m20 20-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0', plus:'M12 5v14M5 12h14', check:'m5 12 4 4L19 6', book:'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4zm16 0h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-3h3z', layers:'m12 3 10 6-10 6L2 9zm-9 11 9 5 9-5M3 18l9 5 9-5', rotate:'M20 7v5h-5M4 17v-5h5m-4-4a8 8 0 0 1 13-4l2 3M4 17l2 3a8 8 0 0 0 13-4', eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0', scan:'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M7 12h10M12 7v10', clock:'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', share:'M8 11 16 6M8 13l8 5M8 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0m14-8a3 3 0 1 1-6 0 3 3 0 0 1 6 0m0 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0', close:'m6 6 12 12M6 18 18 6', menu:'M4 6h16M4 12h16M4 18h16', filter:'M4 6h16M7 12h10m-7 6h4', up:'m6 15 6-6 6 6', down:'m6 9 6 6 6-6', trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7', note:'M5 3h10l4 4v14H5zm9 0v5h5M8 12h8m-8 4h6', calendar:'M4 5h16v16H4zm0 5h16M8 3v4m8-4v4', comment:'M3 4h18v13H8l-5 4zM7 9h10m-10 4h7', expand:'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5', info:'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', save:'M4 3h13l3 3v15H4zm3 0v6h9V3M8 21v-8h8v8', play:'m9 5 11 7-11 7z', link:'m10 8 2-2a5 5 0 0 1 7 7l-3 3a5 5 0 0 1-7 0m5 0-2 2a5 5 0 0 1-7-7l3-3a5 5 0 0 1 7 0'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]||ICONS.book}"/></svg>`;
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const media = {logo:'/assets/devpt-logo.png',simlab:'/assets/simlab-logo.png',simemr:'/assets/brand/simemr-wordmark.png',painmap:'/assets/brand/3dpain-wordmark.png',...(window.DEVPT_MEDIA||{}),...(typeof MEDIA==='object'&&MEDIA?MEDIA:{})};
const localReview = window.DEVPT_LOCAL_PREVIEW === true;
const catalogTextFields = ['id','title','topic','region','type','level','media','symbol','desc','outcome','source'];
let catalogValid = false;
let ASSETS = [];
function updateCatalog() {
  const suppliedCatalog = localReview && typeof NATIVE_CATALOG !== 'undefined' ? NATIVE_CATALOG : window.DEVPT_TEACHING_CATALOG;
  const suppliedActivities = suppliedCatalog?.activities;
  catalogValid = suppliedCatalog?.schemaVersion === 1
    && suppliedCatalog.status === (localReview ? 'local-development-only' : 'public-resources')
    && Array.isArray(suppliedActivities) && suppliedActivities.length > 0
    && suppliedActivities.every(item=>item && typeof item==='object' && !Array.isArray(item)
      && catalogTextFields.every(field=>typeof item[field]==='string' && item[field].trim().length>0)
      && /^[a-z0-9][a-z0-9-]*$/.test(item.id) && Number.isFinite(item.minutes) && item.minutes>=0
      && (item.nativeId===undefined || (typeof item.nativeId==='string' && /^[a-z0-9][a-z0-9-]*$/.test(item.nativeId))))
    && new Set(suppliedActivities.map(item=>item.id)).size===suppliedActivities.length;
  // The source-owned projection is authoritative. A missing source never falls
  // back to a copied catalog or exposes a local-development candidate.
  ASSETS = catalogValid ? suppliedActivities.map(item=>({...item,nativeId:item.nativeId||item.id})) : [];
}
updateCatalog();
const nativeBase = localReview && typeof NATIVE_SOURCE_BASE === 'string' ? NATIVE_SOURCE_BASE : 'https://lab.devpt.app';
const COLLECTIONS = [
 {id:'all-hip',title:'All Things Hip',group:'region',icon:'layers',kicker:'HIP',description:'Anatomy, ROM, biomechanics, manual therapy and imaging in one place.',ids:['hip-anatomy','hip-rotation','hip-flexion','hip-biomechanics','hip-manual-therapy','sectional-anatomy']},
 {id:'eyes-vestibular',title:'Eyes & Vestibular',group:'both',icon:'eye',kicker:'HEAD & NECK',description:'Explore eye responses and the inner-ear mechanisms behind them.',ids:['canal-mechanics','bppv-examination','eye-responses']},
 {id:'all-rom',title:'All Things ROM',group:'topic',icon:'rotate',kicker:'RANGE OF MOTION',description:'Open the existing movement demonstrations and examine the findings.',ids:['hip-rotation','hip-flexion','hip-biomechanics','gait']},
 {id:'biomechanics',title:'Biomechanics',group:'topic',icon:'rotate',kicker:'MOTION & MECHANICS',description:'Connect joint motion, regional anatomy and whole-body movement.',ids:['hip-biomechanics','hip-anatomy','gait']},
 {id:'manual-therapy',title:'Manual Therapy',group:'topic',icon:'layers',kicker:'SETUP & DIRECTION',description:'Inspect the existing technique illustrations and related anatomy.',ids:['hip-manual-therapy','hip-anatomy','hip-biomechanics']},
 {id:'gait',title:'Gait',group:'topic',icon:'rotate',kicker:'CC WALKS & ROM',description:'Study the gait cycle of existing CC walks and the effects of supported ROM constraints.',ids:['gait','hip-rotation','hip-biomechanics']},
 {id:'imaging',title:'Anatomy through Imaging',group:'topic',icon:'scan',kicker:'SYNTHETIC VIEWS',description:'Connect anatomical structures with the source viewer’s synthetic images.',ids:['sectional-anatomy','hip-anatomy']},
 {id:'physiology',title:'Physiology',group:'topic',icon:'clock',kicker:'POSTURE & EFFORT',description:'Explore the native vital-signs sandbox with its authored profiles and trends.',ids:['live-vitals']},
 {id:'neuroscience',title:'Neuroscience',group:'topic',icon:'layers',kicker:'STIMULUS & PATHWAY',description:'Follow the native neural-pathway explorer from a stimulus to its illustrated response.',ids:['neural-pathways']},
 {id:'whole-body',title:'Whole-body Explorers',group:'region',icon:'layers',kicker:'WHOLE BODY',description:'Open the existing physiology and neural-pathway tools without a patient case.',ids:['live-vitals','neural-pathways']}
];
const collectionById = id=>COLLECTIONS.find(c=>c.id===id);
const collectionAssets = collection=>collection.ids.map(id=>ASSETS.find(a=>a.id===id)).filter(Boolean);
const nativeURL = asset=>{const base=new URL(nativeBase,location.protocol==='file:'?'http://127.0.0.1:8110':location.href);if(!['http:','https:'].includes(base.protocol))throw new Error('Invalid native source');const url=new URL(base.pathname.replace(/\/$/,'')+'/teaching/',base.origin);url.searchParams.set('activity',asset.nativeId||asset.id);url.searchParams.set('embedded','1');return url;};

const byId = id => ASSETS.find(asset=>asset.id===id);
let TOPICS = ['All topics',...new Set(ASSETS.map(asset=>asset.topic))];
const STORAGE = 'devpt.saved-resources.v1';
let saved = [];
try { const value=JSON.parse(localStorage.getItem(STORAGE)||'[]'); if(Array.isArray(value)) saved=[...new Set(value.filter(id=>typeof id==='string'&&/^[a-z0-9][a-z0-9-]*$/.test(id)&&(byId(id)||!catalogValid)))]; } catch {}
let filters={q:'',topic:'All topics',region:'All regions',sort:'featured'};
let nativeTimer,toastTimer,dialogOrigin;
const app=document.querySelector('#app');
const modal=document.querySelector('#modal');
const selected=id=>saved.includes(id);
function notify(message){document.querySelector('#announcer').textContent=message;const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(saved));}catch{}}
function route(){const raw=location.hash.replace(/^#\/?/,'')||'home';const [path,query='']=raw.split('?');return {path,params:new URLSearchParams(query)};}
function go(path){const hash='#/'+path;if(location.hash===hash)render();else location.hash=hash;}
function header(page){return `<header class="topbar"><div class="wrap"><a href="/" class="brand" aria-label="DevPT home"><img src="${media.logo}" alt="DevPT" width="102" height="32"></a><nav class="nav" aria-label="Primary">${[['regions','Regions'],['topics','Topics'],['library','All resources'],['products','Products'],['contact','Contact']].map(([id,label])=>`<a href="#/${id}" class="${page===id?'active':''}" ${page===id?'aria-current="page"':''}>${label}</a>`).join('')}</nav><div class="nav-end"><a href="#/saved" class="nav-lesson" aria-label="Saved resources, ${saved.length}">${icon('layers')}<span class="saved-label">Saved</span><span class="count" data-saved-count>${saved.length}</span></a><button class="menu-toggle" data-menu aria-label="Toggle navigation" aria-expanded="false">${icon('menu')}</button></div></div></header><div class="preview-strip compact-preview"><div class="wrap">${localReview?`<button class="local-pill" data-preview-info aria-label="Local development build, not public. Show details."><span class="dot"></span>Local · not public ${icon('info')}</button>`:`<span class="micro">Interactive teaching resources</span>`}<a href="#/faculty">For faculty ${icon('arrow')}</a></div></div>`;}
function footer(){return `<footer class="footer"><div class="wrap site-footer-content"><a href="/" class="brand" aria-label="DevPT home"><img src="${media.logo}" alt="DevPT" width="102" height="32"></a><nav aria-label="Product navigation"><a href="/simlab/">simLAB</a><a href="/emrs/">EMRs</a><a href="/3dpain/">3Dpain.app</a><a href="#/contact">Contact</a></nav><nav class="legal-nav" aria-label="Information"><a href="https://campus.und.edu/directory/daniel.j.stone" target="_blank" rel="noopener">Dan Stone</a><a href="https://www.linkedin.com/in/dan-stone-1684391b" target="_blank" rel="noopener">LinkedIn</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/accessibility.html">Accessibility</a><a href="/resource-credits.html">Resource credits</a><a href="/sitemap.html">Sitemap</a></nav><span class="copyright">© ${new Date().getFullYear()} DevPT</span></div></footer>`;}
function placeholder(asset){const words=asset.media==='gait'?'CC NATIVE<br>GAIT':asset.topic==='Physiology'?'LIVE<br>VITALS':asset.topic==='Neuroscience'?'NEURAL<br>PATHWAYS':asset.media==='imaging'?'SECTIONAL<br>ANATOMY':asset.media==='manual'?'MANUAL<br>THERAPY':asset.media==='biomechanics'?'JOINT<br>MECHANICS':'REGIONAL<br>ANATOMY';return `<div class="poster-placeholder ${asset.media==='imaging'?'imaging':''}"><div class="orb">${icon(asset.symbol)}</div><div class="poster-word">${words}</div></div>`;}
function visual(asset){return media[asset.media]?`<img src="${media[asset.media]}" alt="${esc(asset.title)} preview" loading="lazy">`:placeholder(asset);}
function addButton(asset,compact=true){const yes=selected(asset.id);return `<button class="button small ${compact?'icon-add':''} ${yes?'added':'secondary'}" data-add="${asset.id}" ${compact?'data-compact="true"':''} aria-pressed="${yes}" title="${yes?'Remove from saved resources':'Save resource'}" aria-label="${yes?'Remove '+esc(asset.title)+' from saved resources':'Save '+esc(asset.title)}">${icon(yes?'check':'plus')}${compact?'':yes?'Saved':'Save resource'}</button>`;}
function card(asset){return `<article class="asset-card"><a href="#/activity/${asset.id}" class="asset-poster ${esc(asset.media)}" aria-label="Open ${esc(asset.title)}">${visual(asset)}<span class="poster-kind">${esc(asset.type)}</span><span class="poster-time">${asset.minutes} min</span></a><div class="asset-body compact-asset-body"><h3><a href="#/activity/${asset.id}">${esc(asset.title)}</a></h3>${addButton(asset)}</div></article>`;}
function collectionCard(collection){const items=collectionAssets(collection);const mediaKey={'all-hip':'anatomy','all-rom':'rom','biomechanics':'biomechanics','manual-therapy':'manual','gait':'gait','eyes-vestibular':'vestibular','imaging':'imaging','physiology':'vitals','neuroscience':'neuro','whole-body':'vitals'}[collection.id];return `<a href="#/collection/${collection.id}" class="browse-collection compact-collection" aria-label="${collection.title}, ${items.length} resources"><div class="collection-visual">${mediaKey&&media[mediaKey]?`<img src="${media[mediaKey]}" alt="" loading="lazy">`:`<span class="collection-glyph">${icon(collection.icon)}</span>`}</div><div class="collection-label"><div><h3>${collection.title}</h3><span class="collection-count">${items.length} ${items.length===1?'resource':'resources'}</span></div><span class="collection-arrow">${icon('arrow')}</span></div></a>`;}
function browsePage(kind){const region=kind==='regions';const visible=COLLECTIONS.filter(collection=>(region?['region','both'].includes(collection.group):['topic','both'].includes(collection.group))&&collectionAssets(collection).length);return `<main class="main wrap" id="main" tabindex="-1"><div class="page-head"><h1>${region?'By region':'By topic'}</h1><a href="#/library" class="button secondary small">${icon('search')} All resources</a></div><div class="browse-grid">${visible.map(collectionCard).join('')}</div></main>`;}
function collectionPage(id){const collection=collectionById(id);if(!collection)return missing('Collection unavailable');const items=collectionAssets(collection);return `<main class="main wrap" id="main" tabindex="-1"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/${collection.group==='region'?'regions':'topics'}">${collection.group==='region'?'Regions':'Topics'}</a>${icon('chevron')}<span>${collection.title}</span></nav><section class="collection-hero compact-collection-hero"><div class="collection-title"><span class="icon-box">${icon(collection.icon)}</span><div><h1>${collection.title}</h1><span class="collection-count">${items.length} resources</span></div></div><div class="collection-share"><button class="button small" data-share-collection="${collection.id}">${icon('share')} Share</button><details class="collection-more"><summary aria-label="More collection actions">${icon('menu')}</summary><div><button class="button subtle small" data-copy-collection="${collection.id}">${icon('link')} Copy resource links</button><button class="button subtle small" data-save-collection="${collection.id}">${icon('plus')} Save all</button></div></details></div></section><div class="asset-grid">${items.map(card).join('')}</div><details class="related-drawer"><summary>Related collections ${icon('chevron')}</summary><div class="browse-grid related-collections">${COLLECTIONS.filter(collection=>collection.id!==id&&collection.ids.some(resource=>items.some(item=>item.id===resource))).slice(0,3).map(collectionCard).join('')}</div></details></main>`;}
function productStrip(){return `<nav class="product-strip" aria-label="Explore DevPT products"><a href="/simlab/" aria-label="Explore simLAB"><img src="${media.simlab}" alt="simLAB"></a><a href="/emrs/" aria-label="Explore EMRs"><img src="${media.simemr}" alt="simEMR"></a><a href="/3dpain/" aria-label="Explore 3Dpain.app"><img src="${media.painmap}" alt="3Dpain.app"></a></nav>`;}
function home(){return `<main class="main wrap compact-home" id="main" tabindex="-1"><section class="home-hero"><div><p class="eyebrow">DevPT · Teaching resources</p><h1>Explore.<br>Teach.</h1><div class="actions"><a href="#/regions" class="button">Regions ${icon('arrow')}</a><a href="#/topics" class="button secondary">Topics ${icon('arrow')}</a></div><div class="micro"><span>${icon('check')} No account needed</span></div></div><div class="feature-art"><img src="${media.vestibular}" alt="Interactive vestibular anatomy"><div class="feature-copy"><h2>Eyes & Vestibular</h2><a href="#/collection/eyes-vestibular" aria-label="Open Eyes and Vestibular collection">${icon('arrow')}</a></div></div></section><section aria-labelledby="collections-title"><div class="section-heading"><h2 id="collections-title">Pick a collection.</h2><a class="text-link" href="#/topics">All topics ${icon('arrow')}</a></div><div class="browse-grid home-browse">${['all-hip','all-rom','biomechanics','manual-therapy','gait','eyes-vestibular'].map(collectionById).filter(collection=>collectionAssets(collection).length).map(collectionCard).join('')}</div></section>${byId('gait')?`<section class="gait-feature compact-gait-feature"><div><p class="eyebrow">Gait lab</p><h2>Walk. Observe. Explore.</h2><a href="#/activity/gait" class="button">Open gait lab ${icon('arrow')}</a></div><a class="gait-poster-link" href="#/activity/gait" aria-label="Explore gait lab">${visual(byId('gait'))}</a></section>`:''}<section class="home-products"><div class="section-heading"><h2>Go further.</h2><a class="text-link" href="#/products">Products ${icon('arrow')}</a></div>${productStrip()}</section></main>`;}
function filtered(){return ASSETS.filter(asset=>(filters.topic==='All topics'||asset.topic===filters.topic)&&(filters.region==='All regions'||asset.region===filters.region)&&(!filters.q||filters.q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).every(term=>[asset.title,asset.desc,asset.topic,asset.region,asset.type].join(' ').toLowerCase().split(/[^a-z0-9]+/).some(word=>word.startsWith(term))))).sort((a,b)=>filters.sort==='time'?a.minutes-b.minutes:filters.sort==='title'?a.title.localeCompare(b.title):0);}
function results(){const found=filtered();return `<div class="results-line"><span>${found.length} ${found.length===1?'resource':'resources'}</span></div><div class="asset-grid">${found.length?found.map(card).join(''):`<div class="empty"><h2>No matching resources</h2><button class="button secondary" data-clear-filters>Clear filters</button></div>`}</div>`;}
function library(){return `<main class="main wrap" id="main" tabindex="-1"><div class="page-head"><h1>All resources</h1><a href="#/topics" class="text-link">Collections ${icon('arrow')}</a></div><section class="compact-library" aria-label="Resources"><div class="search-row"><label class="search-box">${icon('search')}<input type="search" id="library-search" placeholder="Search resources…" aria-label="Search resources" value="${esc(filters.q)}"></label><select id="topic-select" class="sort" aria-label="Filter by topic">${TOPICS.map(topic=>`<option ${filters.topic===topic?'selected':''}>${esc(topic)}</option>`).join('')}</select><select id="region-select" class="sort" aria-label="Filter by region">${['All regions',...new Set(ASSETS.map(asset=>asset.region))].map(region=>`<option ${filters.region===region?'selected':''}>${esc(region)}</option>`).join('')}</select><select class="sort" aria-label="Sort resources" id="sort"><option value="featured">Suggested</option><option value="time" ${filters.sort==='time'?'selected':''}>Shortest first</option><option value="title" ${filters.sort==='title'?'selected':''}>A–Z</option></select></div><div id="library-results" aria-live="polite">${results()}</div></section></main>`;}
function player(asset){const url=nativeURL(asset);return `<div class="player native-player" data-player-asset="${asset.id}"><div class="player-bar"><span>${esc(asset.type)}</span>${asset.nativeAvailable===false?`<span class="native-direct">${localReview?'Unavailable locally':'Resource unavailable'}</span>`:`<a class="native-direct" href="${esc(url.href)}" target="_blank" rel="noopener" aria-label="Open ${esc(asset.title)} in full view">${icon('expand')} Full view</a>`}</div><div class="player-stage native-stage">${visual(asset)}${asset.nativeAvailable===false?`<div class="native-unavailable"><strong>${localReview?'Not available locally':'Resource unavailable'}</strong><details><summary>Details</summary><p>${esc(asset.availabilityNote||'Requires the local simPACS service.')}</p></details></div>`:`<div class="native-launch"><button class="button" data-launch-native="${asset.id}">${icon('play')} ${asset.id==='gait'?'Open gait lab':'Open resource'}</button></div>`}<span class="stage-watermark">devpt.app</span></div><p class="player-bottom native-status" role="status"></p></div>`;}
function launchNative(id){const asset=byId(id),shell=document.querySelector(`[data-player-asset="${id}"]`);if(!asset||!shell||asset.nativeAvailable===false||shell.querySelector('iframe'))return;const url=nativeURL(asset);shell.querySelector('.native-stage').innerHTML=`<iframe class="native-frame" src="${esc(url.href)}" title="${esc(asset.title)} interactive resource" allow="fullscreen" referrerpolicy="origin"></iframe>`;shell.classList.add('native-active');shell.querySelector('.native-status').textContent='Loading…';clearTimeout(nativeTimer);nativeTimer=setTimeout(()=>{if(shell.isConnected&&!shell.dataset.ready)shell.querySelector('.native-status').innerHTML=`Not connected. <a href="${esc(url.href)}" target="_blank" rel="noopener">Open full view</a>.`;},25000);}
function sendNativeVisibility(visible){const shell=document.querySelector('.native-player.native-active'),frame=shell?.querySelector('iframe');if(!frame)return;const url=nativeURL(byId(shell.dataset.playerAsset));frame.contentWindow.postMessage({type:'devpt-teaching-visibility',visible},url.origin);}
window.addEventListener('message',event=>{const shell=document.querySelector('.native-player.native-active'),frame=shell?.querySelector('iframe');if(!shell||!frame)return;const asset=byId(shell.dataset.playerAsset),url=nativeURL(asset);if(event.origin!==url.origin||event.source!==frame.contentWindow||event.data?.type!=='devpt-teaching-ready'||event.data.activity!==asset.nativeId)return;shell.dataset.ready='true';clearTimeout(nativeTimer);shell.querySelector('.native-status').textContent='Ready';sendNativeVisibility(!document.hidden&&!modal.open);});
document.addEventListener('visibilitychange',()=>sendNativeVisibility(!document.hidden&&!modal.open));
function activity(id){const asset=byId(id);if(!asset)return missing();const related=ASSETS.filter(other=>other.topic===asset.topic&&other.id!==id).slice(0,3);return `<main class="main wrap activity-page" id="main" tabindex="-1"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/library">Resources</a>${icon('chevron')}<a href="#/library?topic=${encodeURIComponent(asset.topic)}">${esc(asset.topic)}</a></nav><div class="activity-heading compact-activity-heading"><div><h1>${esc(asset.title)}</h1><span class="activity-meta">${esc(asset.region)} · ${asset.minutes} min</span></div><div class="actions">${addButton(asset)}<button class="icon-button" data-share-resource="${asset.id}" aria-label="Share ${esc(asset.title)}" title="Share resource">${icon('share')}</button></div></div><div class="activity-layout focused-activity"><div>${player(asset)}<section class="activity-details"><details><summary>${icon('book')} About this resource ${icon('chevron')}</summary><div><p>${esc(asset.desc)}</p><p>${esc(asset.outcome)}</p></div></details><details><summary>${icon('info')} Model & sources ${icon('chevron')}</summary><div><p>${esc(asset.source)}</p><p>${localReview?'Local development content. Public release review pending.':'Source-owned teaching illustration. See the player for its scope and sources.'}</p></div></details></section></div></div>${related.length?`<details class="related-drawer"><summary>Related resources ${icon('chevron')}</summary><div class="asset-grid">${related.map(card).join('')}</div></details>`:''}</main>`;}
function shareIds(params){const raw=params.get('ids');if(!raw)return null;if(raw.length>2000)return [];return [...new Set(raw.split(',').filter(id=>byId(id)))].slice(0,50);}
function savedPage(params){const shared=shareIds(params),ids=shared||saved,items=ids.map(byId).filter(Boolean);return `<main class="main wrap" id="main" tabindex="-1"><div class="page-head"><div><h1>${shared?'Shared resources':'Saved resources'}</h1><span class="activity-meta">${items.length} resources${shared?'':' · in this browser'}</span></div>${items.length?`<div class="actions"><button class="button small" data-share-saved="${esc(ids.join(','))}">${icon('share')} Share</button><details class="collection-more"><summary aria-label="More saved-resource actions">${icon('menu')}</summary><div><button class="button subtle small" data-copy-resources="${esc(ids.join(','))}">${icon('link')} Copy all links</button>${shared?`<button class="button subtle small" data-save-ids="${esc(ids.join(','))}">${icon('plus')} Save all</button>`:'<button class="button subtle small" data-clear-saved>Clear saved resources</button>'}</div></details></div>`:''}</div>${items.length?`<div class="asset-grid">${items.map(card).join('')}</div>`:`<div class="empty"><span class="icon-box" style="margin:0 auto 20px">${icon('layers')}</span><h2>Keep useful resources together.</h2><p>Use + to save a resource.</p><a href="#/topics" class="button">Explore topics ${icon('arrow')}</a></div>`}</main>`;}
function tray(){return saved.length&&route().path!=='saved'?`<aside class="lesson-tray resource-tray" aria-label="Saved resources"><span class="tray-icon">${icon('layers')}</span><div class="tray-copy"><strong><span data-tray-count>${saved.length}</span> saved</strong></div><button class="button secondary small" data-share-saved="${saved.join(',')}">${icon('share')} Share</button><a class="button small" href="#/saved">View ${icon('arrow')}</a></aside>`:'';}
function productPage(){return `<main class="main wrap products-page" id="main" tabindex="-1"><div class="page-head"><h1>DevPT products</h1><a href="#/contact" class="button secondary small">Let’s talk ${icon('arrow')}</a></div><div class="product-grid site-products"><article
                class="product-tile product-simlab"
                id="app-lab"
                data-product="simlab"
              >
                <header class="product-heading">
                  <h2>
                    <img
                      src="/assets/brand/simlab-wordmark-122.png"
                      srcset="/assets/brand/simlab-wordmark-245.png 2x, /assets/brand/simlab-wordmark-367.png 3x"
                      width="122"
                      height="36"
                      alt=""
                    /><span
                      class="sr-only"
                      >simLAB</span
                    >
                  </h2>
                  <p>Clinical simulation</p>
                </header>
                <div class="product-content">
                  <div class="feature-gallery">
                    <figure class="feature-preview" data-workspace-preview="interview">
                      <figcaption>
                        <h3 id="simlab-interview">Patient interview</h3>
                      </figcaption>
                      <div class="feature-media">
                        <a
                          class="feature-still"
                          data-workspace-launch
                          href="https://lab.devpt.app/showcase/?presentation=workspace&amp;section=interview"
                          target="_blank"
                          rel="noopener"
                          aria-labelledby="simlab-interview"
                        >
                          <img
                            src="/assets/features/simlab/public-interview.jpg"
                            alt="Practice guest interview with James Morgan in the clinical room and the patient conversation."
                            width="1280"
                            height="800"
                            loading="eager"
                            fetchpriority="high"
                            decoding="async"
                          />
                        </a>
                        <div class="workspace-controls">
                          <button
                            type="button"
                            class="workspace-expand"
                            data-workspace-expand
                            hidden
                            aria-haspopup="dialog"
                            aria-controls="workspace-live-dialog"
                            aria-label="Expand Patient interview"
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
                              <path d="M7 3H3v4m0-4 5 5m5-5h4v4m0-4-5 5M3 13v4h4m-4 0 5-5m9 1v4h-4m4 0-5-5" />
                            </svg>
                            <span>Expand</span>
                          </button>
                        </div>
                      </div>
                    </figure>
                    <figure class="feature-preview" data-workspace-preview="reason">
                      <figcaption>
                        <h3 id="simlab-differentials">Connect differentials</h3>
                      </figcaption>
                      <div class="feature-media">
                        <a
                          class="feature-still"
                          data-workspace-launch
                          href="https://lab.devpt.app/showcase/?presentation=workspace&amp;section=reason"
                          target="_blank"
                          rel="noopener"
                          aria-labelledby="simlab-differentials"
                        >
                          <img
                            src="/assets/features/simlab/public-reason.jpg"
                            alt="simLAB guest reasoning workspace with the referral, differential diagnoses and interview plan."
                            width="1280"
                            height="800"
                            loading="lazy"
                            decoding="async"
                          />
                        </a>
                        <div class="workspace-controls">
                          <button
                            type="button"
                            class="workspace-expand"
                            data-workspace-expand
                            hidden
                            aria-haspopup="dialog"
                            aria-controls="workspace-live-dialog"
                            aria-label="Expand Connect differentials"
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
                              <path d="M7 3H3v4m0-4 5 5m5-5h4v4m0-4-5 5M3 13v4h4m-4 0 5-5m9 1v4h-4m4 0-5-5" />
                            </svg>
                            <span>Expand</span>
                          </button>
                        </div>
                      </div>
                    </figure>
                    <figure class="feature-preview" data-workspace-preview="examine">
                      <figcaption>
                        <h3 id="simlab-objective-exam">Objective Exam &amp; Observation</h3>
                      </figcaption>
                      <div class="feature-media">
                        <a
                          class="feature-still"
                          data-workspace-launch
                          href="https://lab.devpt.app/showcase/?presentation=workspace&amp;section=examine"
                          target="_blank"
                          rel="noopener"
                          aria-labelledby="simlab-objective-exam"
                        >
                          <img
                            src="/assets/features/simlab/public-examine.jpg"
                            alt="simLAB guest objective examination with James Morgan and a plan for range of motion, reflex and balance tests."
                            width="1280"
                            height="800"
                            loading="lazy"
                            decoding="async"
                          />
                        </a>
                        <div class="workspace-controls">
                          <button
                            type="button"
                            class="workspace-expand"
                            data-workspace-expand
                            hidden
                            aria-haspopup="dialog"
                            aria-controls="workspace-live-dialog"
                            aria-label="Expand Objective Exam &amp; Observation"
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
                              <path d="M7 3H3v4m0-4 5 5m5-5h4v4m0-4-5 5M3 13v4h4m-4 0 5-5m9 1v4h-4m4 0-5-5" />
                            </svg>
                            <span>Expand</span>
                          </button>
                        </div>
                      </div>
                    </figure>
                  </div>
                  <p class="product-description">
                    Patient encounters, examinations, clinical reasoning and
                    learning labs in one teaching environment.
                  </p>
                  <a class="product-walkthrough btn btn-green" href="/simlab/"
                    >Explore simLAB</a
                  >
                </div>
              </article>
<article
                class="product-tile product-emrs"
                id="app-emrs"
                data-product="emrs"
              >
                <header class="product-heading">
                  <h2 class="emr-logo-pair">
                    <img
                      src="/assets/brand/simemr-wordmark.png"
                      alt="simEMR"
                    /><img
                      src="/assets/brand/probonoemr-wordmark.png"
                      alt="proBonoEMR"
                    />
                  </h2>
                  <p>Documentation experience</p>
                </header>
                <div class="product-content">
                  <div class="feature-gallery">
                    <figure class="feature-preview" data-workspace-preview="documentation">
                      <figcaption>
                        <h3 id="emrs-workspace">Clinical workspace</h3>
                      </figcaption>
                      <div class="feature-media">
                        <a
                          class="feature-still"
                          data-workspace-launch
                          href="https://simemr.devpt.app/showcase/?presentation=workspace&amp;section=documentation"
                          target="_blank"
                          rel="noopener"
                          aria-labelledby="emrs-workspace"
                        >
                          <img
                            src="/assets/features/emrs/workspace.png"
                            alt="simEMR note workspace with structured documentation and the Note Guide."
                            width="1280"
                            height="800"
                            loading="lazy"
                            decoding="async"
                          />
                        </a>
                        <div class="workspace-controls">
                          <button
                            type="button"
                            class="workspace-expand"
                            data-workspace-expand
                            hidden
                            aria-haspopup="dialog"
                            aria-controls="workspace-live-dialog"
                            aria-label="Expand Clinical workspace"
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
                              <path d="M7 3H3v4m0-4 5 5m5-5h4v4m0-4-5 5M3 13v4h4m-4 0 5-5m9 1v4h-4m4 0-5-5" />
                            </svg>
                            <span>Expand</span>
                          </button>
                        </div>
                      </div>
                    </figure>
                    <figure class="feature-preview" data-workspace-preview="schedule">
                      <figcaption>
                        <h3 id="emrs-student-schedule">Student schedule</h3>
                      </figcaption>
                      <div class="feature-media">
                        <a
                          class="feature-still"
                          data-workspace-launch
                          href="https://simemr.devpt.app/showcase/?presentation=workspace&amp;section=schedule"
                          target="_blank"
                          rel="noopener"
                          aria-labelledby="emrs-student-schedule"
                        >
                          <img
                            src="/assets/features/emrs/student-schedule.png"
                            alt="Student clinic schedule with booked visits and available appointment times, using practice patients."
                            width="1280"
                            height="800"
                            loading="lazy"
                            decoding="async"
                          />
                        </a>
                        <div class="workspace-controls">
                          <button
                            type="button"
                            class="workspace-expand"
                            data-workspace-expand
                            hidden
                            aria-haspopup="dialog"
                            aria-controls="workspace-live-dialog"
                            aria-label="Expand Student schedule"
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
                              <path d="M7 3H3v4m0-4 5 5m5-5h4v4m0-4-5 5M3 13v4h4m-4 0 5-5m9 1v4h-4m4 0-5-5" />
                            </svg>
                            <span>Expand</span>
                          </button>
                        </div>
                      </div>
                    </figure>
                    <figure class="feature-preview" data-workspace-preview="feedback">
                      <figcaption>
                        <h3 id="emrs-faculty-feedback">Faculty feedback</h3>
                      </figcaption>
                      <div class="feature-media">
                        <a
                          class="feature-still"
                          data-workspace-launch
                          href="https://simemr.devpt.app/showcase/?presentation=workspace&amp;section=feedback"
                          target="_blank"
                          rel="noopener"
                          aria-labelledby="emrs-faculty-feedback"
                        >
                          <img
                            src="/assets/features/emrs/faculty-feedback.png"
                            alt="Faculty feedback on a practice patient note with instructional comments."
                            width="1280"
                            height="800"
                            loading="lazy"
                            decoding="async"
                          />
                        </a>
                        <div class="workspace-controls">
                          <button
                            type="button"
                            class="workspace-expand"
                            data-workspace-expand
                            hidden
                            aria-haspopup="dialog"
                            aria-controls="workspace-live-dialog"
                            aria-label="Expand Faculty feedback"
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
                              <path d="M7 3H3v4m0-4 5 5m5-5h4v4m0-4-5 5M3 13v4h4m-4 0 5-5m9 1v4h-4m4 0-5-5" />
                            </svg>
                            <span>Expand</span>
                          </button>
                        </div>
                      </div>
                    </figure>
                  </div>
                  <p class="product-description">
                    Practice documentation with Virtual Standardized Patients
                    (VSPs) in simEMR, or support authorized clinic care with
                    proBonoEMR.
                  </p>
                  <a class="product-walkthrough btn btn-green" href="/emrs/"
                    >Explore EMRs</a
                  >
                </div>
              </article>
<article
                class="product-tile product-painmap"
                id="app-painmap"
                data-product="painmap"
              >
                <header class="product-heading">
                  <h2>
                    <img src="/assets/brand/3dpain-wordmark.png" alt="" /><span
                      class="sr-only"
                      >3Dpain.app</span
                    >
                  </h2>
                  <p>3D symptom mapping</p>
                </header>
                <div class="product-content">
                  <div class="feature-gallery">
                    <figure class="feature-preview" data-workspace-preview="mapping">
                      <figcaption>
                        <h3 id="painmap-mapping">Map symptoms</h3>
                      </figcaption>
                      <div class="feature-media">
                        <a
                          class="feature-still"
                          data-workspace-launch
                          href="https://www.3dpain.app/showcase/?presentation=workspace&amp;section=mapping"
                          target="_blank"
                          rel="noopener"
                          aria-labelledby="painmap-mapping"
                        >
                          <img
                            src="/assets/features/painmap/mapping.png"
                            alt="3Dpain.app body map showing a sample pain region."
                            width="1280"
                            height="800"
                            loading="lazy"
                            decoding="async"
                          />
                        </a>
                        <div class="workspace-controls">
                          <button
                            type="button"
                            class="workspace-expand"
                            data-workspace-expand
                            hidden
                            aria-haspopup="dialog"
                            aria-controls="workspace-live-dialog"
                            aria-label="Expand Map symptoms"
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
                              <path d="M7 3H3v4m0-4 5 5m5-5h4v4m0-4-5 5M3 13v4h4m-4 0 5-5m9 1v4h-4m4 0-5-5" />
                            </svg>
                            <span>Expand</span>
                          </button>
                        </div>
                      </div>
                    </figure>
                    <figure class="feature-preview" data-workspace-preview="movement">
                      <figcaption>
                        <h3 id="painmap-movement">Pose &amp; movement</h3>
                      </figcaption>
                      <div class="feature-media">
                        <a
                          class="feature-still"
                          data-workspace-launch
                          href="https://www.3dpain.app/showcase/?presentation=workspace&amp;section=movement"
                          target="_blank"
                          rel="noopener"
                          aria-labelledby="painmap-movement"
                        >
                          <img
                            src="/assets/features/painmap/movement.png"
                            alt="3Dpain.app pose and movement features on a three-dimensional body."
                            width="1280"
                            height="800"
                            loading="lazy"
                            decoding="async"
                          />
                        </a>
                        <div class="workspace-controls">
                          <button
                            type="button"
                            class="workspace-expand"
                            data-workspace-expand
                            hidden
                            aria-haspopup="dialog"
                            aria-controls="workspace-live-dialog"
                            aria-label="Expand Pose &amp; movement"
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
                              <path d="M7 3H3v4m0-4 5 5m5-5h4v4m0-4-5 5M3 13v4h4m-4 0 5-5m9 1v4h-4m4 0-5-5" />
                            </svg>
                            <span>Expand</span>
                          </button>
                        </div>
                      </div>
                    </figure>
                    <figure class="feature-preview" data-workspace-preview="timeline">
                      <figcaption>
                        <h3 id="painmap-timeline">Pain progression</h3>
                      </figcaption>
                      <div class="feature-media">
                        <a
                          class="feature-still"
                          data-workspace-launch
                          href="https://www.3dpain.app/showcase/?presentation=workspace&amp;section=timeline"
                          target="_blank"
                          rel="noopener"
                          aria-labelledby="painmap-timeline"
                        >
                          <img
                            src="/assets/features/painmap/timeline.png"
                            alt="3Dpain.app timeline reviewing changes in a sample pain map over time."
                            width="1280"
                            height="800"
                            loading="lazy"
                            decoding="async"
                          />
                        </a>
                        <div class="workspace-controls">
                          <button
                            type="button"
                            class="workspace-expand"
                            data-workspace-expand
                            hidden
                            aria-haspopup="dialog"
                            aria-controls="workspace-live-dialog"
                            aria-label="Expand Pain progression"
                          >
                            <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
                              <path d="M7 3H3v4m0-4 5 5m5-5h4v4m0-4-5 5M3 13v4h4m-4 0 5-5m9 1v4h-4m4 0-5-5" />
                            </svg>
                            <span>Expand</span>
                          </button>
                        </div>
                      </div>
                    </figure>
                  </div>
                  <p class="product-description">
                    Describe symptom location, quality and intensity on a
                    three-dimensional body, and explore how maps change over
                    time.
                  </p>
                  <a class="product-walkthrough btn btn-green" href="/3dpain/"
                    >Explore 3Dpain.app</a
                  >
                </div>
              </article></div></main>`;}

function contact(){return `<main class="main wrap" id="main" tabindex="-1"><section class="contact-card" id="contact"><span class="icon-box">${icon('comment')}</span><h1>Let's talk.</h1><p>Courses, classrooms, and what comes next.</p><a class="button" href="mailto:daniel.j.stone@und.edu?subject=DevPT%20product%20walkthrough&body=Institution%20or%20organization%3A%0AInterested%20in%3A%0AWhat%20you%27d%20like%20to%20explore%3A%0A">Request a walkthrough ${icon('arrow')}</a><a class="contact-email" href="mailto:daniel.j.stone@und.edu">daniel.j.stone@und.edu</a></section>${productStrip()}</main>`;}
function faculty(){return `<main class="main wrap" id="main" tabindex="-1"><div class="page-head"><h1>For faculty</h1><span class="tag">No account needed</span></div><div class="guide-grid compact-guide">${[['layers','Find','Pick a region or topic.'],['play','Explore','Open any resource.'],['share','Share','One collection. One link.']].map(([symbol,title,copy])=>`<article class="guide-card"><span class="icon-box">${icon(symbol)}</span><h2>${title}</h2><p>${copy}</p></article>`).join('')}</div><div class="actions" style="margin-top:24px"><a href="#/topics" class="button">Explore topics ${icon('arrow')}</a><a href="#/saved" class="button secondary">Saved resources ${icon('layers')}</a></div></main>`;}
function missing(title='Resource unavailable',copy='Choose a resource from the current library.'){return `<main class="main wrap" id="main" tabindex="-1"><div class="empty"><h1>${esc(title)}</h1><p>${esc(copy)}</p><a href="#/library" class="button">All resources ${icon('arrow')}</a></div></main>`;}
function catalogUnavailable(){if(window.DEVPT_CATALOG_STATE==='loading')return `<main class="main wrap" id="main" tabindex="-1"><div class="empty" role="status"><h1>Loading resources…</h1></div>${productStrip()}</main>`;return `<main class="main wrap" id="main" tabindex="-1"><div class="empty" role="alert"><span class="icon-box" style="margin:0 auto 18px">${icon('info')}</span><h1>Library unavailable</h1><p>The source teaching catalog could not be loaded.</p><button class="button secondary" data-reload-catalog>Reload</button></div>${productStrip()}</main>`;}
function render({focus=false}={}){document.dispatchEvent(new Event('devpt:before-render'));sendNativeVisibility(false);clearTimeout(nativeTimer);const {path,params}=route();const [page,id]=path.split('/');let content;if(page==='products')content=productPage();else if(page==='contact')content=contact();else if(page==='faculty'||page==='about')content=faculty();else if(!catalogValid)content=catalogUnavailable();else if(page==='regions'||page==='topics'||page==='collections'||page==='lessons')content=browsePage(page==='regions'?'regions':'topics');else if(page==='collection')content=collectionPage(id);else if(page==='library'){if(params.has('topic')&&TOPICS.includes(params.get('topic')))filters.topic=params.get('topic');content=library();}else if(page==='activity')content=activity(id);else if(['saved','lesson','teach'].includes(page))content=savedPage(params);else content=home();app.innerHTML=header(page)+content+footer()+`<div id="selection-tray">${tray()}</div>`;document.title=(page==='activity'&&byId(id)?byId(id).title:page==='home'||!page?'Teaching resources':page==='contact'?'Contact':page==='products'?'Products':page==='saved'?'Saved resources':'Teaching resources')+' · DevPT';document.dispatchEvent(new Event('devpt:render'));if(focus)document.querySelector('#main')?.focus({preventScroll:true});}
function syncSelectionPresentation(){document.querySelectorAll('[data-add]').forEach(button=>{const asset=byId(button.dataset.add);if(!asset)return;const yes=selected(asset.id);button.classList.toggle('added',yes);button.classList.toggle('secondary',!yes);button.setAttribute('aria-pressed',String(yes));button.setAttribute('aria-label',yes?'Remove '+asset.title+' from saved resources':'Save '+asset.title);button.innerHTML=icon(yes?'check':'plus')+(button.dataset.compact?'':yes?'Saved':'Save resource');button.title=yes?'Remove from saved resources':'Save resource';});document.querySelectorAll('[data-saved-count]').forEach(count=>count.textContent=String(saved.length));document.querySelector('.nav-lesson')?.setAttribute('aria-label','Saved resources, '+saved.length);document.querySelector('#selection-tray').innerHTML=tray();}
function toggleResource(id){if(!byId(id))return;const had=selected(id);saved=had?saved.filter(value=>value!==id):[...saved,id];persist();if(route().path==='saved'&&!route().params.has('ids'))render();else syncSelectionPresentation();notify(had?'Removed from saved resources':'Resource saved');}
function openDialog(title,body){dialogOrigin=document.activeElement;modal.innerHTML=`<div class="modal-head"><h2 id="resource-dialog-title">${esc(title)}</h2><button class="icon-button" data-close-dialog aria-label="Close dialog">${icon('close')}</button></div>${body}`;modal.setAttribute('aria-labelledby','resource-dialog-title');modal.showModal();sendNativeVisibility(false);modal.querySelector('button,input')?.focus();}
function closeDialog(){modal.close();}
modal.addEventListener('close',()=>{dialogOrigin?.focus();sendNativeVisibility(!document.hidden);});
modal.addEventListener('click',event=>{if(event.target!==modal)return;const rect=modal.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog();});
function localURL(hash){const url=new URL(location.href);url.hash=hash;return url.href;}
function idsURL(ids){return localURL('/saved?ids='+ids.filter(id=>byId(id)).join(','));}
function shareDialog(title,url){openDialog(title,`<div class="modal-body"><div class="copy-box"><input readonly id="share-url" value="${esc(url)}" aria-label="Resource share link"><button class="button small" data-copy-url>Copy link</button></div>${localReview?'<p class="share-local-note">Local build · recipients need access to this site.</p>':''}</div>`);}
async function copy(value){try{await navigator.clipboard.writeText(value);notify('Copied');}catch{const area=document.createElement('textarea');area.value=value;area.style.position='fixed';area.style.top='-1000px';document.body.append(area);area.select();const okay=document.execCommand('copy');area.remove();notify(okay?'Copied':'Select and copy the link');}}
function copyResourceLinks(ids){copy(ids.map(byId).filter(Boolean).map(asset=>asset.title+'\n'+localURL('/activity/'+asset.id)).join('\n\n'));}
document.addEventListener('click',event=>{const button=event.target.closest('button,a');if(!button)return;if(button.classList.contains('skip')){event.preventDefault();document.querySelector('#main')?.focus();document.querySelector('#main')?.scrollIntoView({block:'start'});}else if(button.hasAttribute('data-reload-catalog'))location.reload();else if(button.hasAttribute('data-menu')){const open=document.querySelector('.topbar').classList.toggle('menu-open');button.setAttribute('aria-expanded',String(open));}else if(button.hasAttribute('data-preview-info'))openDialog('Local build',`<div class="modal-body"><p>Development only. Public release review is pending. Resources stay connected to their original source applications.</p></div>`);else if(button.hasAttribute('data-launch-native'))launchNative(button.dataset.launchNative);else if(button.hasAttribute('data-add'))toggleResource(button.dataset.add);else if(button.hasAttribute('data-share-resource')){const asset=byId(button.dataset.shareResource);if(asset)shareDialog(asset.title,localURL('/activity/'+asset.id));}else if(button.hasAttribute('data-share-collection')){const collection=collectionById(button.dataset.shareCollection);if(collection)shareDialog(collection.title,localURL('/collection/'+collection.id));}else if(button.hasAttribute('data-copy-collection')){const collection=collectionById(button.dataset.copyCollection);if(collection)copyResourceLinks(collection.ids);}else if(button.hasAttribute('data-save-collection')||button.hasAttribute('data-save-ids')){const ids=button.hasAttribute('data-save-collection')?collectionById(button.dataset.saveCollection)?.ids||[]:button.dataset.saveIds.split(',');saved=[...new Set([...saved,...ids.filter(id=>byId(id))])];persist();syncSelectionPresentation();notify('Resources saved');}else if(button.hasAttribute('data-share-saved'))shareDialog('Share resources',idsURL(button.dataset.shareSaved.split(',')));else if(button.hasAttribute('data-copy-resources'))copyResourceLinks(button.dataset.copyResources.split(','));else if(button.hasAttribute('data-clear-saved')){saved=[];persist();render();notify('Saved resources cleared');}else if(button.hasAttribute('data-copy-url'))copy(document.querySelector('#share-url').value);else if(button.hasAttribute('data-close-dialog'))closeDialog();else if(button.hasAttribute('data-clear-filters')){filters={q:'',topic:'All topics',region:'All regions',sort:'featured'};go('library');}});
document.addEventListener('input',event=>{if(event.target.id==='library-search'){filters.q=event.target.value;document.querySelector('#library-results').innerHTML=results();}});
document.addEventListener('change',event=>{const key={'topic-select':'topic','region-select':'region',sort:'sort'}[event.target.id];if(key){filters[key]=event.target.value;document.querySelector('#library-results').innerHTML=results();}});
document.addEventListener('devpt:catalog-ready',()=>{updateCatalog();TOPICS=['All topics',...new Set(ASSETS.map(asset=>asset.topic))];if(catalogValid){const retained=saved.filter(id=>byId(id));if(retained.length!==saved.length){saved=retained;persist();}}if(!['products','contact','faculty','about'].includes(route().path.split('/')[0]))render();});
window.addEventListener('hashchange',()=>{if(modal.open)closeDialog();render({focus:true});scrollTo(0,0);});
render();
