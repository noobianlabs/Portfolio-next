import {createPosterCollection,escapeHtml as esc} from './posters.mjs';
import {createPosterBackupPanel} from './poster-backup-ui.mjs';
export function restorePosterFocus(content,focus){
 if(!focus)return;
 let target=content.querySelector('#'+CSS.escape(focus));
 if(!target||target.disabled){
  const fallback=focus==='poster-pin'?'poster-mode':focus==='poster-hide'||focus.startsWith('poster-remove-')?'poster-restore':null;
  target=fallback?content.querySelector('#'+fallback):null;
 }
 if(!target?.disabled)target?.focus();
}
export function mountPosterUI({dialog,content,changed,opened}){
 let status='Automatic rotation every minute. Catalog checked on open and every five minutes.',showing=false;
 const collection=createPosterCollection((p,img)=>{changed(p,img);if(showing&&dialog.open)render()},text=>{status=text;const s=content.querySelector('#poster-status');if(s)s.textContent=text});
 const backup=createPosterBackupPanel({collection,onMerged(){if(showing&&dialog.open)render()}});
 function render(){
  const draft=content.querySelector('#poster-add');const focus=document.activeElement?.id,p=collection.current||{title:'No posters selected',credit:'Add an image or switch to the original prints.',id:null},state=collection.state,paused=state.paused===true,pinned=state.pinned.includes(p.id);
  content.innerHTML='<span class="detail-kicker">02 / THE LIVING WALL</span><h2 id="detail-title" class="detail-title">'+esc(p.title)+'</h2><p>'+esc(p.credit)+'</p>'+(p.image?'<img class="poster-img" src="'+esc(p.image)+'" alt="'+esc(p.alt)+'">':'')+'<div class="poster-actions"><button id="poster-next">Next poster</button><button id="poster-pause" aria-pressed="'+paused+'">'+(paused?'Resume rotation':'Pause rotation')+'</button><button id="poster-pin" aria-pressed="'+pinned+'">'+(pinned?'Unpin':'Pin to collection')+'</button><button id="poster-hide">Hide this poster</button></div><label class="poster-mode" for="poster-mode">Show on the wall<select id="poster-mode"><option value="mixed">My collection + original prints</option><option value="curated">My collection only</option><option value="originals">Original prints only</option></select></label><p class="caption" id="poster-status" role="status">'+esc(status)+'</p><h3>My collection</h3><p class="caption">Pin original prints or add your own images. Your images and choices stay in this browser; they do not sync across devices. Use one tab at a time when editing this collection.</p><form id="poster-add"><label for="poster-title">Title (optional)</label><input id="poster-title" maxlength="160" placeholder="A name for your poster"><label for="poster-file">Choose an image</label><input id="poster-file" type="file" accept="image/jpeg,image/png,image/webp" required><button type="submit">Add to my collection</button></form><div class="poster-collection">'+collection.all().filter(x=>state.pinned.includes(x.id)||x.custom).map(x=>'<div class="collection-item"><button id="poster-show-'+esc(x.id)+'" data-show="'+esc(x.id)+'">'+esc(x.title)+'</button>'+(x.custom?'<button id="poster-remove-'+esc(x.id)+'" data-remove="'+esc(x.id)+'" aria-label="Remove '+esc(x.title)+'">Remove</button>':'')+'</div>').join('')+'</div><button id="poster-restore">Restore hidden posters</button><div id="poster-backup-slot"></div><h3>Source & rights</h3>'+(p.source?'<p><a href="'+esc(p.source)+'" target="_blank" rel="noopener noreferrer">View the original print</a></p>':'')+'<p class="caption">'+esc(p.rights)+'</p><p class="caption">The bundled print is original artwork made for this studio. Add only images you have permission to use. Automatic rotation uses this catalog and your browser-local collection.</p>';
  if(draft)content.querySelector('#poster-add').replaceWith(draft);
  content.querySelector('#poster-backup-slot').replaceWith(backup.element);
  content.querySelector('#poster-pin').disabled=!p.id;content.querySelector('#poster-hide').disabled=!p.id;
  content.querySelector('#poster-mode').value=state.mode;
  content.querySelector('#poster-next').onclick=()=>collection.next();
  content.querySelector('#poster-pause').onclick=()=>{collection.togglePause();render()};
  content.querySelector('#poster-pin').onclick=()=>{collection.togglePin(p.id);render()};
  content.querySelector('#poster-hide').onclick=async()=>{await collection.hide(p.id);if(showing&&dialog.open)render()};
  content.querySelector('#poster-mode').onchange=e=>collection.setMode(e.target.value);
  content.querySelector('#poster-restore').onclick=()=>{collection.restore();if(collection.stored)status='Hidden posters restored.';render()};
  content.querySelectorAll('[data-show]').forEach(b=>b.onclick=()=>collection.display(collection.all().find(x=>x.id===b.dataset.show)));
  content.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{collection.remove(b.dataset.remove);render()});
  content.querySelector('#poster-add').onfocusin=()=>collection.setEditing(true);content.querySelector('#poster-add').onfocusout=e=>{if(!e.currentTarget.contains(e.relatedTarget))collection.setEditing(false)};
  content.querySelector('#poster-add').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button'),statusNode=content.querySelector('#poster-status'),file=form.querySelector('#poster-file').files[0],title=form.querySelector('#poster-title').value;button.disabled=true;try{await collection.add(file,title);status='Added. This image is saved only in this browser.';form.reset()}catch(err){status=err.message}finally{button.disabled=false;if(showing&&dialog.open){if(statusNode?.isConnected)statusNode.textContent=status;render()}}};
  restorePosterFocus(content,focus);
 }
 dialog.addEventListener('close',()=>{showing=false;backup.close();collection.setEditing(false)});
 collection.display(collection.current).then(()=>collection.refresh());
 return {collection,open(){showing=true;opened();render();dialog.showModal();document.querySelector('#close-details').focus();collection.refresh()}};
}
