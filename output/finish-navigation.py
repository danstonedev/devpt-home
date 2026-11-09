from pathlib import Path
p=Path('teaching-library.js');s=p.read_text()
s=s.replace("ids=items.map(entry=>entry.asset.id);","ids=entries.map(entry=>entry.id);")
s=s.replace("${items.length?`<div class=\"actions\"><button class=\"button small\" data-share-saved=", "${entries.length?`<div class=\"actions\"><button class=\"button small\" data-share-saved=")
start=s.index('<details class="collection-more">',s.index('function savedPage('))
end=s.index('</details>',start)+len('</details>')
s=s[:start]+'''<button class="button small secondary" data-collection-actions aria-label="More saved-resource actions">${icon('menu')}</button>'''+s[end:]
insert=s.index('\nfunction tray(')
s=s[:insert]+'''
function collectionActions(){const shared=!!sharedCollection(route().params),ids=displayedCollection().map(item=>item.id);openDialog('Saved-resource actions',`<div class="modal-body"><div class="actions"><button class="button secondary" data-copy-resources="${esc(ids.join(','))}">Copy all available links</button>${shared?`<button class="button" data-save-ids="${esc(ids.join(','))}">Save all</button>`:'<button class="button secondary" data-clear-saved>Clear saved resources</button>'}</div></div>`);}
'''+s[insert:]
s=s.replace("else if(button.hasAttribute('data-save-ids'))", "else if(button.hasAttribute('data-collection-actions'))collectionActions();else if(button.hasAttribute('data-save-ids'))")
s=s.replace("persist();syncSelectionPresentation();notify('Resources saved');", "persist();syncSelectionPresentation();closeDialog();notify('Resources saved');")
s=s.replace("saved=[];savedViews={};persist();render();", "saved=[];savedViews={};persist();closeDialog();render();")
s=s.replace("function idsURL(ids){return DevptNavigation.encodeCollection(collectionItems(ids)).then(token=>localURL('/saved?set='+token));}\n",'')
# Semantically equivalent actions survive replacement of their source-owned resource ID.
s=s.replace("findFocus(origin.key)||document.querySelector('#main')", "findFocus(origin.key)||(origin.key?.attr?document.querySelector('.page-band ['+origin.key.attr+']'):null)||document.querySelector('#main')")
# Source updates replace the URL; the host must not associate an obsolete snapshot with it.
s=s.replace("shell.dataset.playerAsset=next.id;history.replaceState(history.state,'',`#/activity/${next.id}`);", "shell.dataset.playerAsset=next.id;history.replaceState(history.state,'',`#/activity/${next.id}`);renderedRouteKey=routeKey();")
s=s.replace("if(switchInPlace()){if(keepSwitch)", "if(switchInPlace()){renderedRouteKey=routeKey();if(keepSwitch)")
p.write_text(s,encoding='utf-8')
p=Path('teaching-library.css');s=p.read_text();s=s.replace('.page-band:before{content:\'\';position:absolute;z-index:-1;right:-4%;','.page-band:before{content:\'\';position:absolute;z-index:-1;right:0;');p.write_text(s,encoding='utf-8')
p=Path('e2e/navigation-corrections.spec.mjs');s=p.read_text();s=s.replace("other.locator('.collection-more summary').click()","other.getByRole('button',{name:'More saved-resource actions',exact:true}).click()")
s=s.replace("await page.locator('h1').click();", "await page.locator('main').click({position:{x:8,y:350}});")
p.write_text(s,encoding='utf-8')
