from pathlib import Path
p=Path('teaching-library.js')
s=p.read_text(encoding='utf-8')
def function(name, code):
    global s
    start=s.index('function '+name+'(')
    end=s.index('\n',start)
    # Existing multi-line functions explicitly handled separately.
    s=s[:start]+code+s[end:]
def replace(old,new):
    global s
    assert old in s, old[:150]
    s=s.replace(old,new)

replace("&&(byId(id)||!catalogValid)","")
replace("let query={q:'',region:'',topic:'',limit:120};",'''const VIEW_STORAGE='devpt.saved-resource-views.v1';
let savedViews={};
try{const data=JSON.parse(localStorage.getItem(VIEW_STORAGE)||'{}');for(const [id,value] of Object.entries(data))if(idPattern.test(id)){try{savedViews[id]=DevptNavigation.view(value);}catch{}}}catch{}
let query={q:'',region:'',topic:'',limit:120};
let renderedRouteKey='',restoreFrame=0,collectionCache=null;
const routeKey=()=>location.hash||'#/home';
function rememberNavigation(){
  if(!catalogValid||renderedRouteKey!==routeKey())return;
  const filter=document.querySelector('[data-filter-page]');
  history.replaceState({...history.state,devptNav:{key:routeKey(),scroll:scrollY,limit:query.limit,filter:filter?.value||'',expanded:[...document.querySelectorAll('.ref-more')].map(el=>el.open),focus:focusKey(document.activeElement)}},'',location.href);
}
function focusKey(el){if(!el||el===document.body)return null;if(el.id)return{id:el.id};for(const attr of ['data-share-resource','data-report','data-add','data-menu','data-filter-page'])if(el.hasAttribute?.(attr))return{attr,value:el.getAttribute(attr)};if(el.matches?.('a[href]'))return{href:el.getAttribute('href')};return null;}
function findFocus(key){if(!key)return null;if(key.id)return document.getElementById(key.id);if(key.attr)return [...document.querySelectorAll('['+key.attr+']')].find(el=>el.getAttribute(key.attr)===key.value);if(key.href)return [...document.querySelectorAll('a[href]')].find(el=>el.getAttribute('href')===key.href);return null;}
function restoreNavigation(snapshot,focus){
  cancelAnimationFrame(restoreFrame);if(!catalogValid)return;
  if(snapshot?.key===routeKey()){
    const filter=document.querySelector('[data-filter-page]');if(filter){filter.value=snapshot.filter||'';filterPage(filter);}
    document.querySelectorAll('.ref-more').forEach((el,i)=>{el.open=!!snapshot.expanded?.[i];});
    const key=routeKey();restoreFrame=requestAnimationFrame(()=>{if(key!==routeKey())return;scrollTo(0,snapshot.scroll||0);if(focus)findFocus(snapshot.focus)?.focus({preventScroll:true});});
  }else if(focus){scrollTo(0,0);document.querySelector('#main')?.focus({preventScroll:true});}
}
function updateSearchRoute(){const params=new URLSearchParams();for(const key of ['q','region','topic'])if(query[key])params.set(key,query[key]);history.replaceState(history.state,'','#/library'+(params.size?'?'+params:''));renderedRouteKey=routeKey();rememberNavigation();}
function savedView(id,raw=savedViews[id]){if(!raw||byId(raw.resource)?.id!==byId(id)?.id)return null;for(const workspace of ['anatomy-explorer','lower-extremity-explorer'].map(byId).filter(isAnatomyWorkspace)){const view=validateAnatomyView(raw,workspace);if(view)return{workspace,view};}return null;}
function resourceHash(asset,raw){const saved=savedView(asset.id,raw);if(!saved)return '#/activity/'+asset.id;const params=new URLSearchParams();writeAnatomyViewParams(params,saved.view);return '#/activity/'+saved.workspace.id+'?'+params;}
function collectionItems(ids=saved){return ids.map(id=>({id,...(savedViews[id]?{view:savedViews[id]}:{})}));}
function sharedCollection(params){
  const token=params.get('set');
  if(token!==null){
    if(collectionCache?.token!==token){
      const state=collectionCache={token,status:'loading',items:[]};
      DevptNavigation.decodeCollection(token).then(items=>{state.items=items;state.status='ready';},()=>{state.status='error';state.error='This collection link is invalid, unsupported or too large. Ask the sender for a new link.';}).then(()=>{if(collectionCache===state&&route().params.get('set')===token)render();});
    }
    return collectionCache;
  }
  if(!params.has('ids'))return null;
  const raw=params.get('ids');try{if(raw.length>512*1024)throw new Error();return{status:'ready',items:DevptNavigation.items([...new Set(raw.split(',').filter(Boolean))])};}catch{return{status:'error',error:'This collection link is invalid or too large. Ask the sender for a new link.',items:[]};}
}
function displayedCollection(){return sharedCollection(route().params)?.items||collectionItems();}
async function shareCollection(ids){const key=routeKey();try{const current=displayedCollection(),items=ids.map(id=>current.find(item=>item.id===id)||collectionItems([id])[0]);const token=await DevptNavigation.encodeCollection(items);if(key===routeKey())shareDialog('Share resources',localURL('/saved?set='+token));}catch(error){notify(error.message||'Unable to create the collection link.');}}
function closeMenu(focus=false){const header=document.querySelector('.topbar.menu-open');if(!header)return false;header.classList.remove('menu-open');const toggle=header.querySelector('[data-menu]');toggle?.setAttribute('aria-expanded','false');if(focus)toggle?.focus();return true;}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented&&closeMenu(true))event.preventDefault();});
document.addEventListener('click',event=>{const link=event.target.closest?.('a[href^="#/"]');if(link&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&event.button===0)rememberNavigation();if(!event.target.closest?.('.topbar'))closeMenu();},true);
let scrollFrame=0;
addEventListener('scroll',()=>{if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;rememberNavigation();});},{passive:true});
document.addEventListener('toggle',event=>{if(event.target.matches?.('.ref-more'))rememberNavigation();},true);''')
function('persist',"function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(saved));localStorage.setItem(VIEW_STORAGE,JSON.stringify(savedViews));}catch{notify('Browser storage is unavailable; these changes will not survive a reload.');}}")
function('resultRow', '''function resultRow(asset,raw){const view=raw&&savedView(asset.id,raw)?.view;return `<li class="ref-result"><a href="${esc(resourceHash(asset,raw))}">${mark('region',asset.regionId,'mark-result')||mark('topic',asset.topicId,'mark-result')}<span class="result-copy"><strong>${esc(asset.title)}</strong><span>${mark('topic',asset.topicId,'mark-inline')}${place(asset)}</span>${view?`<small class="saved-view-note">Saved view · ${view.side==='L'?'Left':'Right'} · ${view.cohort==='female'?'Female':'Male'}${view.practice?' · Practice':''}</small>`:''}</span></a>${addButton(asset)}</li>`;}''')
# map's index must never be interpreted as a view argument.
replace('shown.map(resultRow)','shown.map(asset=>resultRow(asset))')
function('player', '''function player(asset){return `<div class="player native-player" data-player-asset="${asset.id}"><div class="player-stage native-stage">${visual(asset)}${asset.nativeAvailable===false?`<div class="native-unavailable"><strong>${localReview?'Not available locally':'Resource unavailable'}</strong><details><summary>Details</summary><p>${esc(asset.availabilityNote||'Requires the local simPACS service.')}</p></details></div>`:`<div class="native-launch"><button class="button" data-launch-native="${asset.id}">${icon('play')} Open resource</button></div>`}<span class="stage-watermark">devpt.app</span></div><div class="native-recovery" hidden><p class="native-status" role="status"></p><div class="actions"><button class="button small secondary" data-player-exit>Back to page</button><button class="button small secondary" data-player-retry>Retry</button><a class="button small secondary" data-player-direct target="_blank" rel="noopener">Open full view</a></div></div></div>`;}''')
function('launchNative', '''function launchNative(id){const asset=byId(id),shell=document.querySelector(`[data-player-asset="${id}"]`);if(!asset||!shell||asset.nativeAvailable===false||shell.querySelector('iframe'))return;const url=nativeURL(asset);shell.querySelector('.native-stage').innerHTML=`<iframe class="native-frame" src="${esc(url.href)}" title="${esc(asset.title)} interactive resource" allow="fullscreen" referrerpolicy="origin"></iframe>`;shell.classList.add('native-active');const view=anatomyViewFromRoute(asset);if(view)shell.dataset.anatomyView=JSON.stringify(view);showRecovery(shell,url);if(phoneScreen()&&opensFull(asset)||history.state?.devptPlayer==='fullscreen')playerScreen(true);clearTimeout(nativeTimer);nativeTimer=setTimeout(()=>{if(shell.isConnected&&!shell.dataset.ready)showRecovery(shell,url,true);},25000);}
function showRecovery(shell,url,failed=false){const box=shell.querySelector('.native-recovery');box.hidden=false;shell.querySelector('.native-status').textContent=failed?'The resource did not connect. Retry or open it directly.':'Loading resource…';shell.querySelector('[data-player-direct]').href=url.href;shell.dataset.loading=failed?'failed':'loading';}
function retryPlayer(){const shell=document.querySelector('.native-player.native-active');if(!shell)return;delete shell.dataset.ready;shell.querySelector('iframe')?.remove();launchNative(shell.dataset.playerAsset);}''')
function('playerScreen', '''function playerScreen(on,tell=false,fromHistory=false){const root=document.documentElement,shell=document.querySelector('.native-player.native-active'),frame=shell?.querySelector('iframe');on=!!(on&&shell);const changed=on!==root.classList.contains('player-fullscreen');root.classList.toggle('player-fullscreen',on);shell?.classList.toggle('fullscreen',on);if(on){if(changed&&shell.requestFullscreen&&!document.fullscreenElement&&browserFullscreen())shell.requestFullscreen().catch(()=>{});if(!fromHistory&&!playerHistory&&history.state?.devptPlayer!=='fullscreen'){rememberNavigation();history.pushState({...history.state,devptPlayer:'fullscreen'},'',location.href);}playerHistory=true;}else{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});if(playerHistory&&!fromHistory){exitingPlayerView=currentPlayerViewHash();playerHistory=false;history.back();}else playerHistory=false;}if(tell&&frame){const url=nativeURL(byId(shell.dataset.playerAsset));frame.contentWindow.postMessage({type:'devpt-teaching-fullscreen',on},url.origin);}}''')
replace("window.addEventListener('popstate',()=>{const wasPlayer=playerHistory,view=exitingPlayerView||(wasPlayer?currentPlayerViewHash():null);exitingPlayerView=null;if(wasPlayer){playerHistory=false;playerScreen(false,true);}if(view&&route().path===view.path&&location.hash!==view.hash)history.replaceState(history.state,'',view.hash);});",'''window.addEventListener('popstate',()=>{const wasPlayer=playerHistory,view=exitingPlayerView||(wasPlayer?currentPlayerViewHash():null);exitingPlayerView=null;const shell=document.querySelector('.native-player.native-active');if(history.state?.devptPlayer==='fullscreen'&&shell&&route().path==='activity/'+shell.dataset.playerAsset)playerScreen(true,true,true);else if(wasPlayer)playerScreen(false,true,true);if(view&&route().path===view.path&&location.hash!==view.hash){history.replaceState(history.state,'',view.hash);renderedRouteKey=routeKey();}});''')
replace("shell.querySelector('.native-status').textContent='Ready';", "shell.querySelector('.native-status').textContent='Ready';shell.querySelector('.native-recovery').hidden=true;")
# Context belongs to the source-owned navigator, not a competing atlas selector.
replace("${name}</span>${resourceSwitch(asset)?icon('chevron')+resourceSwitch(asset):''}","${shown===asset?name:`<a href=\"#/region/${shown.regionId}\">${esc(shown.region)}</a>`}</span>${shown===asset?'':icon('chevron')+'<a href=\"#/topic/'+shown.topicId+'\">'+esc(shown.topic)+'</a>'}")
replace("${addButton(shown).replace('title=\"Save resource\"',shown===asset?'title=\"Save explorer\"':'title=\"Save resource\"')}","${anatomySaveButton(asset,shown)}")
function('resourceSwitch',s[s.index('function resourceSwitch('):s.index('\n',s.index('function resourceSwitch('))].replace("if(all.length<2", "if(isAnatomyWorkspace(asset)||all.length<2"))
# source message/header refresh must retain a connected action focus.
replace("main.querySelector('.page-band').outerHTML=activityBand(asset);", "refreshActivityBand(asset);")
replace("main.querySelector('.page-band').outerHTML=activityBand(next);", "refreshActivityBand(next);")
replace("if(band)band.outerHTML=activityBand(asset);", "if(band)refreshActivityBand(asset);")
replace("shell.dataset.anatomyView=JSON.stringify(view);const main=", "shell.dataset.anatomyView=JSON.stringify(view);renderedRouteKey=routeKey();const main=")
start=s.index('function shareIds(');end=s.index('\nfunction tray(',start)
s=s[:start]+'''function anatomySaveButton(workspace,shown){const view=anatomyViewFromRoute(workspace);if(!view)return addButton(shown);const exact=selected(shown.id)&&JSON.stringify(savedViews[shown.id])===JSON.stringify(view),label=exact?'Remove saved view':selected(shown.id)?'Update saved view':'Save current view';return `<button class="button small icon-add ${exact?'added':'secondary'}" data-add="${shown.id}" data-save-view aria-pressed="${exact}" aria-label="${label}" title="${label}">${icon(exact?'check':'plus')}</button>`;}
function refreshActivityBand(asset){const band=document.querySelector('#main .page-band'),key=band?.contains(document.activeElement)?focusKey(document.activeElement):null;if(band)band.outerHTML=activityBand(asset);if(key)findFocus(key)?.focus({preventScroll:true});}
function savedPage(params){
 const shared=sharedCollection(params),entries=shared?.items||collectionItems(),resolved=entries.map(entry=>({...entry,asset:byId(entry.id)})),items=resolved.filter(entry=>entry.asset),unknown=resolved.filter(entry=>!entry.asset),ids=items.map(entry=>entry.asset.id);
 const issue=shared?.status==='loading'?'<p role="status">Opening shared collection…</p>':shared?.status==='error'?`<p role="alert">${esc(shared.error)}</p>`:'';
 const unavailable=unknown.length?`<p role="status">${unknown.length} resources are not available in the current catalog. Their IDs are retained.</p><ul>${unknown.map(item=>`<li>${esc(item.id)}</li>`).join('')}</ul>`:'';
 return `<main class="main wrap" id="main" tabindex="-1"><div class="page-band"><div class="page-head"><div><h1>${shared?'Shared resources':'Saved resources'}</h1><span class="activity-meta">${items.length} resources${shared?'':' · in this browser'}</span></div>${items.length?`<div class="actions"><button class="button small" data-share-saved="${esc(ids.join(','))}">${icon('share')} Share</button><details class="collection-more"><summary aria-label="More saved-resource actions">${icon('menu')}</summary><div><button class="button subtle small" data-copy-resources="${esc(ids.join(','))}">${icon('link')} Copy all links</button>${shared?`<button class="button subtle small" data-save-ids="${esc(ids.join(','))}">${icon('plus')} Save all</button>`:'<button class="button subtle small" data-clear-saved>Clear saved resources</button>'}</div></details></div>`:''}</div></div>${issue}${unavailable}${items.length?`<ul class="ref-results">${items.map(({asset,view})=>resultRow(asset,view)).join('')}</ul>`:!issue&&!unknown.length?`<div class="empty"><h2>Keep useful resources together.</h2><p>Use + to save a resource.</p><a href="#/regions" class="button">Browse regions ${icon('arrow')}</a></div>`:''}</main>`;
}'''+s[end:]
function('render',s[s.index('function render('):s.index('\n',s.index('function render('))]
 .replace("canonicalizeAnatomyRoute();", "canonicalizeAnatomyRoute();const snapshot=history.state?.devptNav;")
 .replace("for(const key of ['q','region','topic'])if(params.has(key)){query[key]=params.get(key);query.limit=120;}","for(const key of ['q','region','topic'])query[key]=params.get(key)||'';query.limit=snapshot?.key===routeKey()?snapshot.limit||120:120;")
 .replace("else content=home();", "else if(page==='home')content=home();else content=missing('Page not found','This address is not a library page. Search the library or use Regions.');")
 .replace("document.dispatchEvent(new Event('devpt:render'));", "renderedRouteKey=routeKey();document.dispatchEvent(new Event('devpt:render'));")
 .replace("if(focus)document.querySelector('#main')?.focus({preventScroll:true});", "restoreNavigation(snapshot,focus);"))
function('syncSelectionPresentation',s[s.index('function syncSelectionPresentation('):s.index('\n',s.index('function syncSelectionPresentation('))].replace("if(!asset)return;", "if(!asset)return;if(button.hasAttribute('data-save-view')){const workspace=byId(route().path.split('/')[1]);button.outerHTML=anatomySaveButton(workspace,asset);return;}"))
function('toggleResource', '''function toggleResource(id,asView=false){const asset=byId(id);if(!asset)return;id=asset.id;const view=asView?anatomyViewFromRoute(byId(route().path.split('/')[1])):null;if(asView&&!view)return;const had=selected(id),same=view&&JSON.stringify(view)===JSON.stringify(savedViews[id]),remove=had&&(!view||same);if(remove){saved=saved.filter(value=>value!==id);delete savedViews[id];}else{if(!had)saved.push(id);if(view)savedViews[id]=view;}persist();if(route().path==='saved')render();else syncSelectionPresentation();notify(remove?'Removed from saved resources':view?'Current view saved':'Resource saved');}''')
replace("dialogOrigin=document.activeElement;", "dialogOrigin={element:document.activeElement,key:focusKey(document.activeElement),path:route().path,shell:document.querySelector('.native-player.native-active')};")
replace("dialogOrigin?.focus();", "const origin=dialogOrigin;dialogOrigin=null;if(origin&&(origin.path===route().path||origin.shell?.isConnected)){const target=origin.element?.isConnected?origin.element:findFocus(origin.key)||document.querySelector('#main');target?.focus({preventScroll:true});}")
function('idsURL',"function idsURL(ids){return DevptNavigation.encodeCollection(collectionItems(ids)).then(token=>localURL('/saved?set='+token));}")
replace("box.hidden=true;", "box.innerHTML='<p>QR unavailable for this link. Use Copy link.</p>';")
function('copyResourceLinks',"function copyResourceLinks(ids){const entries=displayedCollection();copy(ids.map(id=>({asset:byId(id),view:entries.find(item=>item.id===id)?.view})).filter(item=>item.asset).map(({asset,view})=>asset.title+'\\n'+localURL(resourceHash(asset,view))).join('\\n\\n'));}")
replace("else if(button.hasAttribute('data-launch-native'))", "else if(button.hasAttribute('data-player-exit'))playerScreen(false,true);else if(button.hasAttribute('data-player-retry'))retryPlayer();else if(button.hasAttribute('data-launch-native'))")
replace("toggleResource(button.dataset.add)","toggleResource(button.dataset.add,button.hasAttribute('data-save-view'))")
replace("query.limit+=120;document.querySelector('#library-results').innerHTML=results();", "query.limit+=120;document.querySelector('#library-results').innerHTML=results();rememberNavigation();")
replace("const ids=button.dataset.saveIds.split(',');saved=[...new Set([...saved,...ids.map(id=>byId(id)?.id).filter(Boolean)])];persist();", "const entries=displayedCollection();for(const item of entries){const id=byId(item.id)?.id||item.id;if(!saved.includes(id))saved.push(id);if(item.view&&savedView(id,item.view))savedViews[id]=item.view;}persist();")
replace("shareDialog('Share resources',idsURL(button.dataset.shareSaved.split(',')))", "shareCollection(button.dataset.shareSaved.split(','))")
replace("saved=[];persist();", "saved=[];savedViews={};persist();")
replace("query={q:'',region:'',topic:'',limit:120};go('library');", "query={q:'',region:'',topic:'',limit:120};updateSearchRoute();render();")
replace("document.querySelector('#library-results').innerHTML=results();}else if(event.target.hasAttribute('data-filter-page'))filterPage(event.target);", "document.querySelector('#library-results').innerHTML=results();updateSearchRoute();}else if(event.target.hasAttribute('data-filter-page')){filterPage(event.target);rememberNavigation();}")
replace("query[key]=event.target.value;query.limit=120;document.querySelector('#library-results').innerHTML=results();", "query[key]=event.target.value;query.limit=120;document.querySelector('#library-results').innerHTML=results();updateSearchRoute();")
replace("switchFocus=true;location.hash=", "rememberNavigation();switchFocus=true;location.hash=")
replace("if(catalogValid){const retained=[...new Set(saved.map(id=>byId(id)?.id).filter(Boolean))];if(retained.join()!==saved.join()){saved=retained;persist();}}", "if(catalogValid){const retained=[...new Set(saved.map(id=>byId(id)?.id||id))];if(retained.join()!==saved.join()){saved=retained;persist();}}rememberNavigation();")
replace("const typing=document.activeElement?.matches?.('.ref-search input')", "const typing=document.activeElement?.matches?.('.ref-search input')")
replace("render({focus:true});scrollTo(0,0);", "render({focus:true});")
p.write_text(s,encoding='utf-8')
