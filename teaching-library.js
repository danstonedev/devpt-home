'use strict';
const ICONS = {
 arrow:'M5 12h14m-5-5 5 5-5 5', chevron:'m9 5 7 7-7 7', search:'m20 20-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0', plus:'M12 5v14M5 12h14', check:'m5 12 4 4L19 6', book:'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4zm16 0h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-3h3z', layers:'m12 3 10 6-10 6L2 9zm-9 11 9 5 9-5M3 18l9 5 9-5', rotate:'M20 7v5h-5M4 17v-5h5m-4-4a8 8 0 0 1 13-4l2 3M4 17l2 3a8 8 0 0 0 13-4', eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0', scan:'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5M7 12h10M12 7v10', clock:'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', share:'M8 11 16 6M8 13l8 5M8 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0m14-8a3 3 0 1 1-6 0 3 3 0 0 1 6 0m0 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0', close:'m6 6 12 12M6 18 18 6', flag:'M5 21V4m0 0h11l-2 4 2 4H5', menu:'M4 6h16M4 12h16M4 18h16', filter:'M4 6h16M7 12h10m-7 6h4', up:'m6 15 6-6 6 6', down:'m6 9 6 6 6-6', trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7', note:'M5 3h10l4 4v14H5zm9 0v5h5M8 12h8m-8 4h6', calendar:'M4 5h16v16H4zm0 5h16M8 3v4m8-4v4', comment:'M3 4h18v13H8l-5 4zM7 9h10m-10 4h7', expand:'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5', info:'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', save:'M4 3h13l3 3v15H4zm3 0v6h9V3M8 21v-8h8v8', play:'m9 5 11 7-11 7z', link:'m10 8 2-2a5 5 0 0 1 7 7l-3 3a5 5 0 0 1-7 0m5 0-2 2a5 5 0 0 1-7-7l3-3a5 5 0 0 1 7 0'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]||ICONS.book}"/></svg>`;
/** Renders of simLAB's own joint models (CC BY-SA 4.0, see /resource-credits.html): a poster and a 2.4 s looping turntable video. */
const REGION_MODELS = ['head-neck','shoulder','elbow-hand','thorax','lumbopelvic','hip','knee','ankle-foot','whole-body'];
const regionModel = id => REGION_MODELS.includes(id)?{poster:`/assets/library/region-${id}.webp`,video:`/assets/library/region-${id}`}:null;
const TOPIC_GLYPHS = {
 anatomy:'M12 2.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM6.5 9.5h11L16 15h-1.8l-.7 6.5h-3L9.8 15H8z',
 imaging:'M3 4h18v16H3zM8.6 8.6l6.8 6.8M9.2 6.9a1.6 1.6 0 1 0-2.3 2.3M14.8 17.1a1.6 1.6 0 1 0 2.3-2.3',
 'joint-mechanics':'M4 20l6.6-6.6M13.2 12.4 19 4M11.9 10.6a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM17 16.5a6 6 0 0 0 .2-6.4',
 'manual-therapy':'M7.5 12V5.5a1.5 1.5 0 0 1 3 0V11M10.5 10V4a1.5 1.5 0 0 1 3 0v6.5M13.5 10.5V5.5a1.5 1.5 0 0 1 3 0V12M16.5 11a1.5 1.5 0 0 1 3 0v3a7.5 7.5 0 0 1-7.5 7.5h-.8a6 6 0 0 1-5.1-2.9L3.6 15a1.5 1.5 0 0 1 2.6-1.5l1.3 2',
 'muscle-function':'M3 12c3.2-6.4 14.8-6.4 18 0-3.2 6.4-14.8 6.4-18 0ZM8 9.6c2.4 1.4 5.6 1.4 8 0M8 14.4c2.4-1.4 5.6-1.4 8 0M1 12h2M21 12h2',
 'range-of-motion':'M3 20h18M3 20 15.5 7.5M10 20a7 7 0 0 0-2-4.9M15.5 6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
 strength:'M6 7v10M3.5 9.5v5M18 7v10M20.5 9.5v5M6 12h12',
 'reflexes-sensation':'M14.2 3.8l6 6-2.6 2.6-6-6zM14.6 9.4 4 20',
 'special-tests':'M9 3.5h6v3H9zM7.5 5H5v16h14V5h-2.5M8.5 13.5l2.5 2.5 4.5-5',
 palpation:'M10 13.5V5a1.5 1.5 0 0 1 3 0v6.5l3.3.7a2 2 0 0 1 1.5 2.4L17 19h-7l-3-4M4 21h16',
 'gait-balance':'M8 2.5c1.9 0 2.6 2.4 2.6 4.6S9.6 11.5 8 11.5 5.4 9.3 5.4 7.1 6.1 2.5 8 2.5ZM6 13.8h4v1.6a2 2 0 0 1-4 0ZM16 7.5c1.9 0 2.6 2.4 2.6 4.6s-1 4.4-2.6 4.4-2.6-2.2-2.6-4.4.7-4.6 2.6-4.6ZM14 18.8h4v.7a2 2 0 0 1-4 0Z',
 'function-exercise':'M14.5 2.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM14 8.5l-2.8 5.3h4.6l1.2 6.7M11.2 13.8l-3 6.7M3.5 11.5v9M3.5 16H9',
 'movement-screens':'M12 2.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM12 8v6M5.5 10h13M12 14l-4.2 2 1.2 5M12 14l4.2 2-1.2 5',
 vestibular:'M12 11.5a4 4 0 1 1 0-8 4 4 0 0 1 0 8ZM12 11.5a4.2 4.2 0 1 0 4.3 4.3M12 11.5a4.2 4.2 0 1 1-4.3 4.3M12 11.5V21',
 'eye-exam':'M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12Zm10-3a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM12 2v2.5M12 19.5V22',
 neuroscience:'M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM12 9V4.5M9.4 10.5 5 8M14.6 10.5 19 8M12 15v5.5M12 20.5l2.2 1.5M12 20.5 9.8 22M12 4.5l-1.8-2M12 4.5l1.8-2M5 8l-2-.4M5 8l-.6-2M19 8l2-.4M19 8l.6-2',
 physiology:'M2 12.5h4l2.2-5.5 4 11 3-7.5 1.8 2h5',
 aquatic:'M2 15.5c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 20c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M12 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM7.5 12.5l4.5-3.2 4.5 3.2'
};
const glyph = id => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${TOPIC_GLYPHS[id]||ICONS.book}"/></svg>`;
const REPORT_TO = 'daniel.j.stone@und.edu';
const REPORT_KINDS = [['information','Information is inaccurate'],['animation','Animation or 3D model looks wrong'],['broken','Doesn’t load or is broken'],['layout','Layout or formatting problem'],['other','Something else']];
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const media = {logo:'/assets/devpt-logo.png',simlab:'/assets/simlab-logo.png',simemr:'/assets/brand/simemr-wordmark.png',painmap:'/assets/brand/3dpain-wordmark.png',...(window.DEVPT_MEDIA||{}),...(typeof MEDIA==='object'&&MEDIA?MEDIA:{})};
const localReview = window.DEVPT_LOCAL_PREVIEW === true;
const catalogTextFields = ['id','title','topic','region','type','level','media','symbol','desc','outcome','source'];
const idPattern = /^[a-z0-9][a-z0-9-]*$/;
const slug = value => String(value??'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
let catalogValid = false;
let ASSETS = [], LISTED = [], REGIONS = [], TOPICS = [], INDEX = new Map();
/** The source's ordered regions or topics; an earlier catalog without them is ordered as its activities first name them. */
function taxonomy(list, field, supplied) {
  const order = Array.isArray(supplied) ? supplied.filter(entry=>entry && typeof entry.id==='string' && idPattern.test(entry.id) && typeof entry.label==='string').map(({id,label})=>({id,label})) : [];
  for (const asset of list) if (!order.some(entry=>entry.id===asset[field+'Id'])) order.push({id:asset[field+'Id'],label:asset[field]});
  return order.filter(entry=>list.some(asset=>asset[field+'Id']===entry.id)).map(entry=>({...entry,count:list.filter(asset=>asset[field+'Id']===entry.id).length}));
}
function updateCatalog() {
  const suppliedCatalog = localReview && typeof NATIVE_CATALOG !== 'undefined' ? NATIVE_CATALOG : window.DEVPT_TEACHING_CATALOG;
  const suppliedActivities = suppliedCatalog?.activities;
  catalogValid = suppliedCatalog?.schemaVersion === 1
    && suppliedCatalog.status === (localReview ? 'local-development-only' : 'public-resources')
    && Array.isArray(suppliedActivities) && suppliedActivities.length > 0
    && suppliedActivities.every(item=>item && typeof item==='object' && !Array.isArray(item)
      && catalogTextFields.every(field=>typeof item[field]==='string' && item[field].trim().length>0)
      && idPattern.test(item.id) && Number.isFinite(item.minutes) && item.minutes>=0
      && (item.nativeId===undefined || (typeof item.nativeId==='string' && idPattern.test(item.nativeId)))
      && ['regionId','topicId','aliasOf'].every(field=>item[field]===undefined || (typeof item[field]==='string' && idPattern.test(item[field]))))
    && new Set(suppliedActivities.map(item=>item.id)).size===suppliedActivities.length;
  // The source-owned projection is authoritative. A missing source never falls
  // back to a copied catalog or exposes a local-development candidate.
  ASSETS = catalogValid ? suppliedActivities.map(item=>({...item,nativeId:item.nativeId||item.id,regionId:item.regionId||slug(item.region),topicId:item.topicId||slug(item.topic)})) : [];
  INDEX = new Map(ASSETS.map(asset=>[asset.id,asset]));
  // A curated activity that duplicates a reference item is listed once, as that item; its own id keeps opening it.
  LISTED = ASSETS.filter(asset=>!(asset.aliasOf && INDEX.has(asset.aliasOf)));
  REGIONS = taxonomy(LISTED,'region',suppliedCatalog?.regions);
  TOPICS = taxonomy(LISTED,'topic',suppliedCatalog?.topics);
}
updateCatalog();
const nativeBase = localReview && typeof NATIVE_SOURCE_BASE === 'string' ? NATIVE_SOURCE_BASE : 'https://lab.devpt.app';
/** Earlier collection links open the region or topic that now holds their resources. */
const LEGACY_COLLECTIONS = {'all-hip':'region/hip','whole-body':'region/whole-body','eyes-vestibular':'topic/vestibular','all-rom':'topic/range-of-motion','biomechanics':'topic/joint-mechanics','manual-therapy':'topic/manual-therapy','gait':'topic/gait-balance','imaging':'topic/imaging','physiology':'topic/physiology','neuroscience':'topic/neuroscience'};
const nativeURL = asset=>{const base=new URL(nativeBase,location.protocol==='file:'?'http://127.0.0.1:8110':location.href);if(!['http:','https:'].includes(base.protocol))throw new Error('Invalid native source');const url=new URL(base.pathname.replace(/\/$/,'')+'/teaching/',base.origin);url.searchParams.set('activity',asset.nativeId||asset.id);url.searchParams.set('embedded','1');return url;};

const byId = id => { const asset=INDEX.get(id); return asset?.aliasOf && INDEX.get(asset.aliasOf) || asset; };
const regionById = id => REGIONS.find(region=>region.id===id);
const topicById = id => TOPICS.find(topic=>topic.id===id);
const STORAGE = 'devpt.saved-resources.v1';
let saved = [];
try { const value=JSON.parse(localStorage.getItem(STORAGE)||'[]'); if(Array.isArray(value)) saved=[...new Set(value.filter(id=>typeof id==='string'&&idPattern.test(id)&&(byId(id)||!catalogValid)).map(id=>byId(id)?.id||id))]; } catch {}
let query={q:'',region:'',topic:'',limit:120};
let nativeTimer,toastTimer,dialogOrigin;
const app=document.querySelector('#app');
const modal=document.querySelector('#modal');
const selected=id=>saved.includes(id);
function notify(message){document.querySelector('#announcer').textContent=message;const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2600);}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(saved));}catch{}}
function route(){const raw=location.hash.replace(/^#\/?/,'')||'home';const [path,params='']=raw.split('?');return {path,params:new URLSearchParams(params)};}
function go(path){const hash='#/'+path;if(location.hash===hash)render();else location.hash=hash;}

/* Search: every word must start a word of the resource's title, context, heading, region, topic, type or search
   terms. Title matches rank first. */
const words = text => String(text??'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').split(/[^a-z0-9]+/).filter(Boolean);
const searchWords = asset => asset.searchWords ||= words([asset.title,asset.context,asset.group,asset.region,asset.topic,asset.type,...(Array.isArray(asset.keywords)?asset.keywords:[])].join(' '));
function search({q='',region='',topic=''}={}) {
  const terms=words(q);
  const scope=LISTED.filter(asset=>(!region||asset.regionId===region)&&(!topic||asset.topicId===topic));
  if(!terms.length) return scope;
  return scope.map((asset,order)=>{const all=searchWords(asset);if(!terms.every(term=>all.some(word=>word.startsWith(term))))return null;const title=words(asset.title);return {asset,order,score:terms.filter(term=>title.some(word=>word.startsWith(term))).length*2+(title[0]?.startsWith(terms[0])?1:0)};})
    .filter(Boolean).sort((a,b)=>b.score-a.score||a.order-b.order).map(result=>result.asset);
}
const itemWords = asset => esc(searchWords(asset).join(' '));

function header(page){return `<header class="topbar"><div class="wrap"><a href="/" class="brand" aria-label="DevPT home"><img src="${media.logo}" alt="DevPT" width="102" height="32"></a><span class="beta-tag" title="Beta preview: a work in progress">Beta</span><nav class="nav" aria-label="Primary">${[['regions','Regions'],['topics','Topics'],['library','Search'],['products','Products'],['contact','Contact']].map(([id,label])=>`<a href="#/${id}" class="${page===id||(page==='region'&&id==='regions')||(page==='topic'&&id==='topics')?'active':''}" ${page===id?'aria-current="page"':''}>${label}</a>`).join('')}</nav><div class="nav-end"><a href="#/saved" class="nav-lesson" aria-label="Saved resources, ${saved.length}">${icon('layers')}<span class="saved-label">Saved</span><span class="count" data-saved-count>${saved.length}</span></a><button class="menu-toggle" data-menu aria-label="Toggle navigation" aria-expanded="false">${icon('menu')}</button></div></div></header><div class="preview-strip compact-preview"><div class="wrap">${localReview?`<button class="local-pill" data-preview-info aria-label="Local development build, not public. Show details."><span class="dot"></span>Local · not public ${icon('info')}</button>`:`<span class="beta-note"><strong>Beta preview.</strong> <span class="preview-detail">Resources and animations are still being checked. </span><button type="button" class="link-button" data-report>Report an issue</button></span>`}<a href="#/faculty">For faculty ${icon('arrow')}</a></div></div>`;}
function footer(){return `<footer class="footer"><div class="wrap site-footer-content"><a href="/" class="brand" aria-label="DevPT home"><img src="${media.logo}" alt="DevPT" width="102" height="32"></a><nav aria-label="Product navigation"><a href="/simlab/">simLAB</a><a href="/emrs/">EMRs</a><a href="/3dpain/">3Dpain.app</a><a href="#/contact">Contact</a></nav><nav class="legal-nav" aria-label="Information"><a href="https://campus.und.edu/directory/daniel.j.stone" target="_blank" rel="noopener">Dan Stone</a><a href="https://www.linkedin.com/in/dan-stone-1684391b" target="_blank" rel="noopener">LinkedIn</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/accessibility.html">Accessibility</a><a href="/resource-credits.html">Resource credits</a><button type="button" class="link-button" data-report>Report an issue</button><a href="/sitemap.html">Sitemap</a></nav><span class="copyright">© ${new Date().getFullYear()} DevPT</span></div></footer>`;}
/** Curated resources keep their source captures. A reference item's poster names it, rather than borrowing another region's image. */
function placeholder(asset){return `<div class="poster-placeholder ref-poster ${asset.topicId==='imaging'?'imaging':''}"><div class="orb">${icon(asset.symbol)}</div><div class="poster-word">${esc(asset.region).toUpperCase()}<br>${esc(asset.topic).toUpperCase()}</div></div>`;}
function visual(asset){return !('launch' in asset)&&media[asset.media]?`<img src="${media[asset.media]}" alt="${esc(asset.title)} preview" loading="lazy">`:placeholder(asset);}
function addButton(asset,compact=true){const yes=selected(asset.id);return `<button class="button small ${compact?'icon-add':''} ${yes?'added':'secondary'}" data-add="${asset.id}" ${compact?'data-compact="true"':''} aria-pressed="${yes}" title="${yes?'Remove from saved resources':'Save resource'}" aria-label="${yes?'Remove '+esc(asset.title)+' from saved resources':'Save '+esc(asset.title)}">${icon(yes?'check':'plus')}${compact?'':yes?'Saved':'Save resource'}</button>`;}
const place = asset => `${esc(asset.region)} › ${esc(asset.topic)}${asset.group&&asset.group!==asset.region?` · ${esc(asset.group)}`:''}`;
/** One resource in a search, saved or related list: its title, where it is filed, and Save. */
function resultRow(asset){return `<li class="ref-result"><a href="#/activity/${asset.id}"><strong>${esc(asset.title)}</strong><span>${place(asset)}</span></a>${addButton(asset)}</li>`;}
function productStrip(){return `<nav class="product-strip" aria-label="Explore DevPT products"><a href="/simlab/" aria-label="Explore simLAB"><img src="${media.simlab}" alt="simLAB" loading="lazy" decoding="async"></a><a href="/emrs/" aria-label="Explore EMRs"><img src="${media.simemr}" alt="simEMR" loading="lazy" decoding="async"></a><a href="/3dpain/" aria-label="Explore 3Dpain.app"><img src="${media.painmap}" alt="3Dpain.app" loading="lazy" decoding="async"></a></nav>`;}
function searchBox(label,value='',scope=''){return `<form class="ref-search" role="search" data-search-form ${scope?`data-scope="${esc(scope)}"`:''}><label class="search-box">${icon('search')}<input type="search" name="q" value="${esc(value)}" placeholder="${esc(label)}" aria-label="${esc(label)}" autocomplete="off"></label><button class="button" type="submit">Search</button></form>`;}

/* Headings within a list appear only where they tell resources apart (two joint modules, the spine's segments). */
const FINDINGS = 'Example findings';
function grouped(items){const groups=[];for(const asset of items){const label=asset.group&&asset.group!==asset.region?asset.group:'';let group=groups.find(entry=>entry.label===label);if(!group)groups.push(group={label,items:[]});group.items.push(asset);}const rank=label=>!label?0:label===FINDINGS?2:1;return groups.sort((a,b)=>rank(a.label)-rank(b.label));}
function links(items){return `<ul class="ref-list">${items.map(asset=>`<li data-words="${itemWords(asset)}"><a href="#/activity/${asset.id}">${esc(asset.title)}</a></li>`).join('')}</ul>`;}
const COLLAPSE_AFTER = 24;
function sectionBody(items){const groups=grouped(items),headed=groups.length>1;let shown=0;const open=[],more=[];for(const group of groups){const html=`<div class="ref-group">${headed&&group.label?`<h3>${esc(group.label)}</h3>`:''}${links(group.items)}</div>`;(shown<COLLAPSE_AFTER||items.length<=COLLAPSE_AFTER+8?open:more).push(html);shown+=group.items.length;}return open.join('')+(more.length?`<details class="ref-more"><summary>Show all ${items.length}</summary>${more.join('')}</details>`:'');}
/** A region page lists its topics; a topic page lists its regions. */
function referencePage(kind,id){
  const region=kind==='region',entry=region?regionById(id):topicById(id);
  if(!entry)return missing(region?'Region unavailable':'Topic unavailable','Choose a region or topic from the library.');
  const items=LISTED.filter(asset=>asset[kind+'Id']===id),by=region?'topic':'region',order=region?TOPICS:REGIONS;
  const parts=order.map(part=>({...part,items:items.filter(asset=>asset[by+'Id']===part.id)})).filter(part=>part.items.length);
  return `<main class="main wrap ref-page" id="main" tabindex="-1"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/${kind}s">${region?'Regions':'Topics'}</a>${icon('chevron')}<span>${esc(entry.label)}</span></nav><div class="page-head ref-head">${region&&regionModel(id)?`<span class="ref-head-media" data-turn="${regionModel(id).video}"><img src="${regionModel(id).poster}" alt="" width="480" height="360"></span>`:!region?`<span class="ref-head-glyph">${glyph(id)}</span>`:''}<div><h1>${esc(entry.label)}</h1><span class="activity-meta">${items.length} ${items.length===1?'resource':'resources'} · ${parts.length} ${region?(parts.length===1?'topic':'topics'):(parts.length===1?'region':'regions')}</span></div><div class="actions"><button class="button small secondary" data-report>${icon('flag')} Report an issue</button><button class="button small secondary" data-share-route="${kind}/${id}" data-share-title="${esc(entry.label)}">${icon('share')} Share</button></div></div><label class="search-box ref-filter">${icon('filter')}<input type="search" data-filter-page placeholder="Filter ${esc(entry.label.toLowerCase())}" aria-label="Filter ${esc(entry.label)} resources" autocomplete="off"></label>${parts.length>1?`<nav class="ref-jump" aria-label="${region?'Topics':'Regions'} on this page">${parts.map(part=>`<button type="button" data-jump="part-${part.id}">${esc(part.label)} <span>${part.items.length}</span></button>`).join('')}</nav>`:''}<p class="ref-none" data-filter-empty hidden>No ${esc(entry.label.toLowerCase())} resources match.</p>${parts.map(part=>`<section class="ref-section" id="part-${part.id}" aria-labelledby="heading-${part.id}"><h2 id="heading-${part.id}"><a href="#/${by}/${part.id}">${esc(part.label)}</a><span class="ref-count">${part.items.length}</span></h2>${sectionBody(part.items)}</section>`).join('')}</main>`;
}
function indexCard(kind,entry){const items=LISTED.filter(asset=>asset[kind+'Id']===entry.id),other=kind==='region'?TOPICS:REGIONS,by=kind==='region'?'topic':'region';const names=other.filter(part=>items.some(asset=>asset[by+'Id']===part.id)).map(part=>part.label);const model=kind==='region'&&regionModel(entry.id);return `<a href="#/${kind}/${entry.id}" class="ref-card ${kind}-card" aria-label="${esc(entry.label)}, ${items.length} resources">${model?`<span class="ref-card-media" data-turn="${model.video}"><img src="${model.poster}" alt="" width="480" height="360" loading="lazy" decoding="async"></span>`:kind==='topic'?`<span class="ref-card-glyph">${glyph(entry.id)}</span>`:''}<span class="ref-card-title"><strong>${esc(entry.label)}</strong><span class="ref-count">${items.length}</span></span><span class="ref-card-topics">${esc(names.slice(0,5).join(' · '))}${names.length>5?` · +${names.length-5}`:''}</span></a>`;}
function indexPage(kind){const list=kind==='region'?REGIONS:TOPICS;return `<main class="main wrap" id="main" tabindex="-1"><div class="page-head"><h1>${kind==='region'?'By region':'By topic'}</h1><a href="#/library" class="button secondary small">${icon('search')} Search</a></div><div class="ref-grid ${kind==='topic'?'topics':''}">${list.map(entry=>indexCard(kind,entry)).join('')}</div></main>`;}
function home(pending=false){const stat=n=>pending?'<span class="stat-wait">·</span>':n,shells=n=>Array.from({length:n},()=>'<span class="ref-card ref-card-shell" aria-hidden="true"><span class="ref-card-media"></span><span class="shell-line"></span><span class="shell-line short"></span></span>').join('');return `<main class="main wrap ref-home" id="main" tabindex="-1"><section class="ref-hero devpt-hero" aria-labelledby="hero-title"><div class="hero-copy"><p class="eyebrow">DevPT · Reference library <span class="beta-pill">Beta preview</span></p><h1 id="hero-title">Reference library</h1><p class="lead">Interactive anatomy, joint mechanics, examination and vestibular resources from simLAB, filed by body region and topic. Free to open, no account needed.</p>${searchBox('Search, for example Lachman, posterior glide or HINTS')}<dl class="hero-stats"><div><dt>Resources</dt><dd>${stat(LISTED.length)}</dd></div><div><dt>Regions</dt><dd>${stat(REGIONS.length)}</dd></div><div><dt>Topics</dt><dd>${stat(TOPICS.length)}</dd></div></dl></div><figure class="hero-model" aria-hidden="true"><img src="/assets/library/hero-skeleton.webp" srcset="/assets/library/hero-skeleton-380.webp 380w, /assets/library/hero-skeleton.webp 760w" sizes="(max-width: 520px) 96px, (max-width: 800px) 150px, 380px" alt="" width="760" height="1000" fetchpriority="high" decoding="async"><figcaption>simLAB 3D anatomy</figcaption></figure></section><section aria-labelledby="regions-title"><div class="section-heading"><h2 id="regions-title">By region</h2><a class="text-link" href="#/regions">All regions ${icon('arrow')}</a></div><div class="ref-grid regions" ${pending?'aria-busy="true"':''}>${pending?shells(REGION_MODELS.length):REGIONS.map(region=>indexCard('region',region)).join('')}</div></section><section aria-labelledby="topics-title" class="section"><div class="section-heading"><h2 id="topics-title">By topic</h2><a class="text-link" href="#/topics">All topics ${icon('arrow')}</a></div><div class="ref-grid topics" ${pending?'aria-busy="true"':''}>${pending?shells(6):TOPICS.map(topic=>indexCard('topic',topic)).join('')}</div></section><section class="home-products section"><div class="section-heading"><h2>Go further.</h2><a class="text-link" href="#/products">Products ${icon('arrow')}</a></div>${productStrip()}</section></main>`;}
function results(){const found=search(query),shown=found.slice(0,query.limit);return `<div class="results-line"><span>${found.length} ${found.length===1?'resource':'resources'}</span></div>${found.length?`<ul class="ref-results">${shown.map(resultRow).join('')}</ul>${found.length>shown.length?`<button class="button secondary small ref-show-more" data-show-more>Show ${Math.min(120,found.length-shown.length)} more</button>`:''}`:`<div class="empty"><h2>No matching resources</h2><button class="button secondary" data-clear-filters>Clear search</button></div>`}`;}
function library(){return `<main class="main wrap" id="main" tabindex="-1"><div class="page-head"><h1>Search the library</h1><a href="#/regions" class="text-link">Browse regions ${icon('arrow')}</a></div><section class="compact-library" aria-label="Resources"><div class="search-row"><label class="search-box">${icon('search')}<input type="search" id="library-search" placeholder="Search resources…" aria-label="Search resources" value="${esc(query.q)}" autocomplete="off"></label><select id="region-select" class="sort" aria-label="Filter by region"><option value="">All regions</option>${REGIONS.map(region=>`<option value="${region.id}" ${query.region===region.id?'selected':''}>${esc(region.label)}</option>`).join('')}</select><select id="topic-select" class="sort" aria-label="Filter by topic"><option value="">All topics</option>${TOPICS.map(topic=>`<option value="${topic.id}" ${query.topic===topic.id?'selected':''}>${esc(topic.label)}</option>`).join('')}</select></div><div id="library-results" aria-live="polite">${results()}</div></section></main>`;}
function player(asset){const url=nativeURL(asset);return `<div class="player native-player" data-player-asset="${asset.id}"><div class="player-bar"><span>${esc(asset.type)}</span>${asset.nativeAvailable===false?`<span class="native-direct">${localReview?'Unavailable locally':'Resource unavailable'}</span>`:`<a class="native-direct" href="${esc(url.href)}" target="_blank" rel="noopener" aria-label="Open ${esc(asset.title)} in full view">${icon('expand')} Full view</a>`}</div><div class="player-stage native-stage">${visual(asset)}${asset.nativeAvailable===false?`<div class="native-unavailable"><strong>${localReview?'Not available locally':'Resource unavailable'}</strong><details><summary>Details</summary><p>${esc(asset.availabilityNote||'Requires the local simPACS service.')}</p></details></div>`:`<div class="native-launch"><button class="button" data-launch-native="${asset.id}">${icon('play')} ${asset.id==='gait'?'Open gait lab':'Open resource'}</button></div>`}<span class="stage-watermark">devpt.app</span></div><p class="player-bottom native-status" role="status"></p></div>`;}
function launchNative(id){const asset=byId(id),shell=document.querySelector(`[data-player-asset="${id}"]`);if(!asset||!shell||asset.nativeAvailable===false||shell.querySelector('iframe'))return;const url=nativeURL(asset);shell.querySelector('.native-stage').innerHTML=`<iframe class="native-frame" src="${esc(url.href)}" title="${esc(asset.title)} interactive resource" allow="fullscreen" referrerpolicy="origin"></iframe>`;shell.classList.add('native-active');shell.querySelector('.native-status').textContent='Loading…';clearTimeout(nativeTimer);nativeTimer=setTimeout(()=>{if(shell.isConnected&&!shell.dataset.ready)shell.querySelector('.native-status').innerHTML=`Not connected. <a href="${esc(url.href)}" target="_blank" rel="noopener">Open full view</a>.`;},25000);}
function sendNativeVisibility(visible){const shell=document.querySelector('.native-player.native-active'),frame=shell?.querySelector('iframe');if(!frame)return;const url=nativeURL(byId(shell.dataset.playerAsset));frame.contentWindow.postMessage({type:'devpt-teaching-visibility',visible},url.origin);}
window.addEventListener('message',event=>{const shell=document.querySelector('.native-player.native-active'),frame=shell?.querySelector('iframe');if(!shell||!frame)return;const asset=byId(shell.dataset.playerAsset),url=nativeURL(asset);if(event.origin!==url.origin||event.source!==frame.contentWindow||event.data?.type!=='devpt-teaching-ready'||event.data.activity!==asset.nativeId)return;shell.dataset.ready='true';clearTimeout(nativeTimer);shell.querySelector('.native-status').textContent='Ready';sendNativeVisibility(!document.hidden&&!modal.open);});
document.addEventListener('visibilitychange',()=>sendNativeVisibility(!document.hidden&&!modal.open));
function activity(id){const asset=byId(id);if(!asset)return missing();const siblings=LISTED.filter(other=>other.regionId===asset.regionId&&other.topicId===asset.topicId&&other.id!==asset.id);const nearby=asset.group?[...siblings.filter(other=>other.group===asset.group),...siblings.filter(other=>other.group!==asset.group)]:siblings;return `<main class="main wrap activity-page" id="main" tabindex="-1"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/region/${asset.regionId}">${esc(asset.region)}</a>${icon('chevron')}<a href="#/topic/${asset.topicId}">${esc(asset.topic)}</a>${asset.group&&asset.group!==asset.region?`${icon('chevron')}<span>${esc(asset.group)}</span>`:''}</nav><div class="activity-heading compact-activity-heading"><div><h1>${esc(asset.title)}</h1><span class="activity-meta">${esc(asset.context||asset.type)}${asset.context&&asset.type!==asset.context?` · ${esc(asset.type)}`:''}</span></div><div class="actions">${addButton(asset)}<button class="icon-button" data-report="${asset.id}" aria-label="Report an issue with ${esc(asset.title)}" title="Report an issue">${icon('flag')}</button><button class="icon-button" data-share-resource="${asset.id}" aria-label="Share ${esc(asset.title)}" title="Share resource">${icon('share')}</button></div></div><div class="activity-layout focused-activity"><div>${player(asset)}<section class="activity-details"><details><summary>${icon('book')} About this resource ${icon('chevron')}</summary><div><p>${esc(asset.desc)}</p><p>${esc(asset.outcome)}</p></div></details><details><summary>${icon('info')} Model & sources ${icon('chevron')}</summary><div><p>${esc(asset.source)}</p><p>${localReview?'Local development content. Public release review pending.':'Source-owned teaching illustration, not a clinical measurement. See the player for its scope and sources.'}</p></div></details></section></div></div>${nearby.length?`<section class="ref-related" aria-labelledby="related-title"><h2 id="related-title">More in ${esc(asset.region)} › ${esc(asset.topic)}</h2>${links(nearby.slice(0,30))}${nearby.length>30?`<a class="text-link" href="#/region/${asset.regionId}">All ${nearby.length+1} ${esc(asset.topic.toLowerCase())} resources ${icon('arrow')}</a>`:''}</section>`:''}</main>`;}
function shareIds(params){const raw=params.get('ids');if(!raw)return null;if(raw.length>2000)return [];return [...new Set(raw.split(',').map(id=>byId(id)?.id).filter(Boolean))].slice(0,50);}
function savedPage(params){const shared=shareIds(params),ids=shared||saved,items=ids.map(byId).filter(Boolean);return `<main class="main wrap" id="main" tabindex="-1"><div class="page-head"><div><h1>${shared?'Shared resources':'Saved resources'}</h1><span class="activity-meta">${items.length} resources${shared?'':' · in this browser'}</span></div>${items.length?`<div class="actions"><button class="button small" data-share-saved="${esc(ids.join(','))}">${icon('share')} Share</button><details class="collection-more"><summary aria-label="More saved-resource actions">${icon('menu')}</summary><div><button class="button subtle small" data-copy-resources="${esc(ids.join(','))}">${icon('link')} Copy all links</button>${shared?`<button class="button subtle small" data-save-ids="${esc(ids.join(','))}">${icon('plus')} Save all</button>`:'<button class="button subtle small" data-clear-saved>Clear saved resources</button>'}</div></details></div>`:''}</div>${items.length?`<ul class="ref-results">${items.map(resultRow).join('')}</ul>`:`<div class="empty"><span class="icon-box" style="margin:0 auto 20px">${icon('layers')}</span><h2>Keep useful resources together.</h2><p>Use + to save a resource.</p><a href="#/regions" class="button">Browse regions ${icon('arrow')}</a></div>`}</main>`;}
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
function faculty(){return `<main class="main wrap" id="main" tabindex="-1"><div class="page-head"><h1>For faculty</h1><span class="tag">No account needed</span></div><div class="guide-grid compact-guide">${[['layers','Find','Pick a region or topic.'],['play','Explore','Open any resource.'],['share','Share','A region, topic or saved list. One link.']].map(([symbol,title,copy])=>`<article class="guide-card"><span class="icon-box">${icon(symbol)}</span><h2>${title}</h2><p>${copy}</p></article>`).join('')}</div><div class="actions" style="margin-top:24px"><a href="#/topics" class="button">Explore topics ${icon('arrow')}</a><a href="#/saved" class="button secondary">Saved resources ${icon('layers')}</a></div></main>`;}
function missing(title='Resource unavailable',copy='Choose a resource from the current library.'){return `<main class="main wrap" id="main" tabindex="-1"><div class="empty"><h1>${esc(title)}</h1><p>${esc(copy)}</p><a href="#/library" class="button">Search the library ${icon('arrow')}</a></div></main>`;}
function catalogUnavailable(){if(window.DEVPT_CATALOG_STATE==='loading')return `<main class="main wrap" id="main" tabindex="-1"><div class="empty" role="status"><h1>Loading resources…</h1></div>${productStrip()}</main>`;return `<main class="main wrap" id="main" tabindex="-1"><div class="empty" role="alert"><span class="icon-box" style="margin:0 auto 18px">${icon('info')}</span><h1>Library unavailable</h1><p>The source teaching catalog could not be loaded.</p><button class="button secondary" data-reload-catalog>Reload</button></div>${productStrip()}</main>`;}
function render({focus=false}={}){document.dispatchEvent(new Event('devpt:before-render'));sendNativeVisibility(false);clearTimeout(nativeTimer);const {path,params}=route();const [page,id]=path.split('/');if(page==='collection'&&LEGACY_COLLECTIONS[id]){location.replace('#/'+LEGACY_COLLECTIONS[id]);return;}let content;if(page==='products')content=productPage();else if(page==='contact')content=contact();else if(page==='faculty'||page==='about')content=faculty();else if(!catalogValid)content=(!page||page==='home')&&window.DEVPT_CATALOG_STATE==='loading'?home(true):catalogUnavailable();else if(page==='regions'||page==='collections')content=indexPage('region');else if(page==='topics'||page==='lessons')content=indexPage('topic');else if(page==='region'||page==='topic')content=referencePage(page,id);else if(page==='collection')content=missing('Collection unavailable','Browse the regions and topics instead.');else if(page==='library'){for(const key of ['q','region','topic'])if(params.has(key)){query[key]=params.get(key);query.limit=120;}if(query.region&&!regionById(query.region))query.region='';if(query.topic&&!topicById(query.topic))query.topic='';content=library();}else if(page==='activity')content=activity(id);else if(['saved','lesson','teach'].includes(page))content=savedPage(params);else content=home();app.innerHTML=header(page)+content+footer()+`<div id="selection-tray">${tray()}</div>`;const asset=page==='activity'?byId(id):null,entry=page==='region'?regionById(id):page==='topic'?topicById(id):null;document.title=(asset?asset.title:entry?entry.label:page==='home'||!page?'Reference library':page==='library'?'Search':page==='contact'?'Contact':page==='products'?'Products':page==='saved'?'Saved resources':'Reference library')+' · DevPT';document.dispatchEvent(new Event('devpt:render'));if(focus)document.querySelector('#main')?.focus({preventScroll:true});}
/** Hide what does not match the region or topic page's filter, and the headings and sections left empty. */
function filterPage(input){const terms=words(input.value),main=input.closest('main');let any=false;main.querySelectorAll('.ref-section').forEach(section=>{let count=0;section.querySelectorAll('li[data-words]').forEach(item=>{const all=item.dataset.words.split(' '),show=terms.every(term=>all.some(word=>word.startsWith(term)));item.hidden=!show;if(show)count++;});section.querySelectorAll('.ref-group').forEach(group=>{group.hidden=!group.querySelector('li:not([hidden])');});if(terms.length)section.querySelectorAll('details.ref-more').forEach(details=>{details.open=true;});section.hidden=!count;any||=count>0;});main.querySelector('[data-filter-empty]').hidden=any;main.querySelectorAll('.ref-jump button').forEach(button=>{button.hidden=!!document.getElementById(button.dataset.jump)?.hidden;});}
function syncSelectionPresentation(){document.querySelectorAll('[data-add]').forEach(button=>{const asset=byId(button.dataset.add);if(!asset)return;const yes=selected(asset.id);button.classList.toggle('added',yes);button.classList.toggle('secondary',!yes);button.setAttribute('aria-pressed',String(yes));button.setAttribute('aria-label',yes?'Remove '+asset.title+' from saved resources':'Save '+asset.title);button.innerHTML=icon(yes?'check':'plus')+(button.dataset.compact?'':yes?'Saved':'Save resource');button.title=yes?'Remove from saved resources':'Save resource';});document.querySelectorAll('[data-saved-count]').forEach(count=>count.textContent=String(saved.length));document.querySelector('.nav-lesson')?.setAttribute('aria-label','Saved resources, '+saved.length);document.querySelector('#selection-tray').innerHTML=tray();}
function toggleResource(id){if(!byId(id))return;const had=selected(id);saved=had?saved.filter(value=>value!==id):[...saved,id];persist();if(route().path==='saved'&&!route().params.has('ids'))render();else syncSelectionPresentation();notify(had?'Removed from saved resources':'Resource saved');}
function openDialog(title,body){dialogOrigin=document.activeElement;modal.innerHTML=`<div class="modal-head"><h2 id="resource-dialog-title">${esc(title)}</h2><button class="icon-button" data-close-dialog aria-label="Close dialog">${icon('close')}</button></div>${body}`;modal.setAttribute('aria-labelledby','resource-dialog-title');modal.showModal();sendNativeVisibility(false);modal.querySelector('button,input')?.focus();}
function closeDialog(){modal.close();}
/** What a report is about: the open resource, or the region, topic or page on screen. */
function reportSubject(id){const asset=id&&byId(id);if(asset)return {label:`${asset.title} — ${asset.region} › ${asset.topic}`,lines:[`Resource: ${asset.title} (${asset.id})`,`Filed under: ${asset.region} › ${asset.topic}${asset.group&&asset.group!==asset.region?` › ${asset.group}`:''}`,`simLAB link: ${asset.url||nativeURL(asset).href}`]};const [page,entryId]=route().path.split('/'),entry=page==='region'?regionById(entryId):page==='topic'?topicById(entryId):null;const label=entry?`${entry.label} (${page})`:document.title.replace(/ · DevPT$/,'');return {label,lines:[`Page: ${label}`]};}
function reportText(form,subject){const data=new FormData(form),kind=REPORT_KINDS.find(([id])=>id===data.get('kind'))?.[1]||'Something else';return {title:`[Reference library] ${kind}: ${subject.label}`.slice(0,180),body:[`Issue: ${kind}`,'',String(data.get('details')||'').trim()||'(no details)','',...subject.lines,`Page link: ${location.href}`,data.get('reply')?`Reply to: ${String(data.get('reply')).trim()}`:'',`Catalog build: ${window.DEVPT_TEACHING_CATALOG?.build||'unknown'}`,`Browser: ${navigator.userAgent}`,`Screen: ${innerWidth}×${innerHeight} @${devicePixelRatio}x`,`Reported: ${new Date().toISOString()}`].filter(line=>line!=='').join('\n')};}
function reportDialog(id){const subject=reportSubject(id);openDialog('Report an issue',`<form class="modal-body report-form" data-report-form data-report-id="${esc(id||'')}"><p class="report-about"><span>About</span><strong>${esc(subject.label)}</strong></p><fieldset><legend>What’s wrong?</legend>${REPORT_KINDS.map(([value,label],index)=>`<label class="report-kind"><input type="radio" name="kind" value="${value}" ${index===0?'checked':''}><span>${esc(label)}</span></label>`).join('')}</fieldset><label class="report-field"><span>Details</span><textarea name="details" rows="4" maxlength="1500" required placeholder="What did you expect, and what did you see? For an animation, say which step or moment."></textarea></label><label class="report-field"><span>Your email <em>(optional, for a reply)</em></span><input type="email" name="reply" autocomplete="email"></label><p class="report-note">${icon('info')} <span>Send by email opens your email app with the report and this page’s details filled in. Nothing is sent until you press send there.</span></p><div class="report-actions"><button class="button" type="submit">${icon('flag')} Send by email</button><button class="button secondary" type="button" data-copy-report>Copy report</button></div></form>`);modal.querySelector('textarea')?.focus();}
modal.addEventListener('close',()=>{dialogOrigin?.focus();sendNativeVisibility(!document.hidden);});
modal.addEventListener('click',event=>{if(event.target!==modal)return;const rect=modal.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog();});
function localURL(hash){const url=new URL(location.href);url.hash=hash;return url.href;}
function idsURL(ids){return localURL('/saved?ids='+ids.filter(id=>byId(id)).join(','));}
function shareDialog(title,url){openDialog(title,`<div class="modal-body"><div class="copy-box"><input readonly id="share-url" value="${esc(url)}" aria-label="Resource share link"><button class="button small" data-copy-url>Copy link</button></div>${localReview?'<p class="share-local-note">Local build · recipients need access to this site.</p>':''}</div>`);}
async function copy(value){try{await navigator.clipboard.writeText(value);notify('Copied');}catch{const area=document.createElement('textarea');area.value=value;area.style.position='fixed';area.style.top='-1000px';document.body.append(area);area.select();const okay=document.execCommand('copy');area.remove();notify(okay?'Copied':'Select and copy the link');}}
function copyResourceLinks(ids){copy(ids.map(byId).filter(Boolean).map(asset=>asset.title+'\n'+localURL('/activity/'+asset.id)).join('\n\n'));}
document.addEventListener('click',event=>{const button=event.target.closest('button,a');if(!button)return;if(button.classList.contains('skip')){event.preventDefault();document.querySelector('#main')?.focus();document.querySelector('#main')?.scrollIntoView({block:'start'});}else if(button.hasAttribute('data-reload-catalog'))location.reload();else if(button.hasAttribute('data-report'))reportDialog(button.dataset.report);else if(button.hasAttribute('data-copy-report')){const form=button.closest('[data-report-form]'),report=reportText(form,reportSubject(form.dataset.reportId));copy(`${report.title}\n\n${report.body}`);}else if(button.hasAttribute('data-menu')){const open=document.querySelector('.topbar').classList.toggle('menu-open');button.setAttribute('aria-expanded',String(open));}else if(button.hasAttribute('data-preview-info'))openDialog('Local build',`<div class="modal-body"><p>Development only. Public release review is pending. Resources stay connected to their original source applications.</p></div>`);else if(button.hasAttribute('data-launch-native'))launchNative(button.dataset.launchNative);else if(button.hasAttribute('data-add'))toggleResource(button.dataset.add);else if(button.hasAttribute('data-share-resource')){const asset=byId(button.dataset.shareResource);if(asset)shareDialog(asset.title,localURL('/activity/'+asset.id));}else if(button.hasAttribute('data-share-route'))shareDialog(button.dataset.shareTitle,localURL('/'+button.dataset.shareRoute));else if(button.hasAttribute('data-jump')){const target=document.getElementById(button.dataset.jump);target?.scrollIntoView({block:'start'});target?.querySelector('h2 a')?.focus({preventScroll:true});}else if(button.hasAttribute('data-show-more')){query.limit+=120;document.querySelector('#library-results').innerHTML=results();}else if(button.hasAttribute('data-save-ids')){const ids=button.dataset.saveIds.split(',');saved=[...new Set([...saved,...ids.map(id=>byId(id)?.id).filter(Boolean)])];persist();syncSelectionPresentation();notify('Resources saved');}else if(button.hasAttribute('data-share-saved'))shareDialog('Share resources',idsURL(button.dataset.shareSaved.split(',')));else if(button.hasAttribute('data-copy-resources'))copyResourceLinks(button.dataset.copyResources.split(','));else if(button.hasAttribute('data-clear-saved')){saved=[];persist();render();notify('Saved resources cleared');}else if(button.hasAttribute('data-copy-url'))copy(document.querySelector('#share-url').value);else if(button.hasAttribute('data-close-dialog'))closeDialog();else if(button.hasAttribute('data-clear-filters')){query={q:'',region:'',topic:'',limit:120};go('library');}});
document.addEventListener('input',event=>{if(event.target.id==='library-search'){query.q=event.target.value;query.limit=120;document.querySelector('#library-results').innerHTML=results();}else if(event.target.hasAttribute('data-filter-page'))filterPage(event.target);});
document.addEventListener('submit',event=>{const report=event.target.closest('[data-report-form]');if(report){event.preventDefault();const {title,body}=reportText(report,reportSubject(report.dataset.reportId));location.href=`mailto:${REPORT_TO}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;closeDialog();notify('Report ready in your email app');return;}const form=event.target.closest('[data-search-form]');if(!form)return;event.preventDefault();const q=String(new FormData(form).get('q')||'').trim();query={q,region:'',topic:'',limit:120};go('library?q='+encodeURIComponent(q));});
document.addEventListener('change',event=>{const key={'topic-select':'topic','region-select':'region'}[event.target.id];if(key){query[key]=event.target.value;query.limit=120;document.querySelector('#library-results').innerHTML=results();}});
document.addEventListener('devpt:catalog-ready',()=>{updateCatalog();if(catalogValid){const retained=[...new Set(saved.map(id=>byId(id)?.id).filter(Boolean))];if(retained.join()!==saved.join()){saved=retained;persist();}}if(!['products','contact','faculty','about'].includes(route().path.split('/')[0])){const typing=document.activeElement?.matches?.('.ref-search input')?document.activeElement.value:null;render();if(typing!==null){const input=document.querySelector('.ref-search input');if(input){input.value=typing;input.focus();}}}});
window.addEventListener('hashchange',()=>{if(modal.open)closeDialog();render({focus:true});scrollTo(0,0);});
render();
/** A region's model turns while the pointer or focus is on it; its frames load on first use. */
// Region turntables are short muted loops fetched only on hover or focus; the poster is their first frame, so the swap is seamless.
// VP9 WebM is the smaller file; H.264 MP4 covers browsers without VP9.
const prefers=query=>typeof matchMedia==='function'&&matchMedia(query).matches;
function spin(media,on){if(!media||prefers('(prefers-reduced-motion: reduce)'))return;let video=media.querySelector('video');if(!on){if(video){video.pause();media.classList.remove('turning');}return;}if(!video){video=document.createElement('video');Object.assign(video,{muted:true,loop:true,playsInline:true,preload:'auto'});video.setAttribute('aria-hidden','true');video.className='turn-video';video.src=media.dataset.turn+(video.canPlayType('video/webm; codecs="vp9"')?'.webm':'.mp4');video.addEventListener('playing',()=>media.classList.contains('want-turn')&&media.classList.add('turning'));media.append(video);}media.classList.add('want-turn');video.play().catch(()=>{});}
for(const [type,on] of [['pointerover',true],['pointerout',false],['focusin',true],['focusout',false]])document.addEventListener(type,event=>{const host=event.target.closest?.('.region-card,.ref-head-media');if(!host||(event.relatedTarget&&host.contains(event.relatedTarget)))return;const media=host.matches('[data-turn]')?host:host.querySelector('[data-turn]');if(type.startsWith('pointer')&&!prefers('(hover: hover)'))return;if(!on)media?.classList.remove('want-turn');spin(media,on);});
