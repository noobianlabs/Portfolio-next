import {backupFromState,parseBackup,decodeBackupImages,mergeBackup,BACKUP_LIMITS} from './poster-backup.mjs';
const BASE='https://studio.invalid/';
export function safeUrl(value,image=false){
 if(typeof value!=='string'||!value.trim())return false;
 if(image&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value))return true;
 try{const u=new URL(value,BASE);return u.protocol==='https:'||(u.origin===BASE&&value.startsWith('./'))}catch{return false}
}
export function validateCatalog(data){
 if(data?.version!==1||!Array.isArray(data.posters)||!data.posters.length||data.posters.length>100)throw Error('Invalid poster catalog');
 const ids=new Set();
 for(const p of data.posters){if(!p||typeof p.id!=='string'||ids.has(p.id)||!p.title||!p.alt||!p.credit||!safeUrl(p.image,true)||!safeUrl(p.source))throw Error('Invalid poster record');ids.add(p.id)}
 return data;
}
export function nextPoster(posters,current){return posters[(posters.findIndex(p=>p.id===current)+1)%posters.length]}
export function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const initial={"version":1,"posters":[{"id":"study-organize-build","title":"Study. Organize. Build.","image":"./assets/study-organize-build.svg","alt":"An original cream, forest green, and orange geometric print with the words Study, Organize, Build.","credit":"Studio print No. 01 \u00b7 Original geometric artwork","source":"./assets/study-organize-build.svg","rights":"Original geometric artwork created for this studio. No third-party artwork is included."}]};
// Hydration is deliberately more permissive than the 12-image backup format:
// legacy overflow must remain available for explicit removal, never truncation.
function hydrateState(raw,defaults){
 const saved=JSON.parse(raw),object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value),validId=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value);
 const invalid=()=>{throw Error('Invalid saved collection')};
 if(!object(saved))invalid();
 const next={...defaults,...saved};
 if(!Array.isArray(next.custom)||next.custom.length>1000||!Array.isArray(next.pinned)||!Array.isArray(next.hidden)||!next.pinned.every(validId)||!next.hidden.every(validId))invalid();
 const ids=new Set();
 next.custom=next.custom.map(p=>{
  if(!object(p)||!validId(p.id)||ids.has(p.id)||typeof p.title!=='string'||typeof p.alt!=='string'||!safeUrl(p.image,true))invalid();
  if(Object.hasOwn(p,'custom')&&p.custom!==true)invalid();
  for(const key of ['credit','rights','source'])if(Object.hasOwn(p,key)&&typeof p[key]!=='string')invalid();
  ids.add(p.id);
  const title=p.title.trim()?p.title:'Untitled poster',alt=p.alt.trim()?p.alt:title;
  const record={...p,custom:true,title,alt};
  if(Object.hasOwn(record,'source')&&!safeUrl(record.source))invalid();
  return record;
 });
 // Preserve existing tolerant preference migrations; these do not discard images.
 next.paused=next.paused===true;
 if(!['mixed','curated','originals'].includes(next.mode))next.mode='mixed';
 return next;
}
export function createPosterCollection(onChange,onStatus=()=>{}){
 let catalog=initial,current=initial.posters[0],editing=false,state={mode:'mixed',paused:false,pinned:[],hidden:[],custom:[]},generation=0,refreshGeneration=0,disposed=false;
 let persistedSnapshot=null,lastSaveFailure=null,attemptedId=null;
 let stored=true,hydrationFailure=null;
 try{persistedSnapshot=localStorage.getItem('portfolio-studio-posters-v1')}catch{stored=false}
 if(stored&&persistedSnapshot!==null){
  try{state=hydrateState(persistedSnapshot,state)}catch{
   stored=false;hydrationFailure=Error('The saved collection is invalid or unsupported. Its original browser data is preserved. Editing and backups are blocked to avoid overwriting it.');
   reportStatus(hydrationFailure.message);
  }
 }
 function reportStatus(message){onStatus(hydrationFailure?.message||message)}
 function allowChanges(){if(!hydrationFailure)return true;reportStatus(hydrationFailure.message);return false}
 function assertEditable(){if(!allowChanges())throw hydrationFailure}
 function save(){
  if(!allowChanges())return false;
  try{assertStorageCurrent();const serialized=JSON.stringify(state);localStorage.setItem('portfolio-studio-posters-v1',serialized);persistedSnapshot=serialized;stored=true;lastSaveFailure=null}
  catch(error){stored=false;lastSaveFailure=error?.code==='POSTER_STORAGE_CHANGED'?error:Error('Browser storage is unavailable or full. These choices could not be saved.');reportStatus(lastSaveFailure.message)}
  return stored;
 }

 const importPlans=new WeakMap();
 function assertOpen(){if(disposed)throw Error('This collection is closed. Reopen it to manage backups.');}
 function collectionFingerprint(){return JSON.stringify({custom:state.custom,pinned:state.pinned,catalogIds:catalog.posters.map(p=>p.id)});}
 function assertStorageCurrent(){
  let actual;try{actual=localStorage.getItem('portfolio-studio-posters-v1')}catch{throw Error('Browser storage is unavailable. The collection could not be saved.');}
  if(actual!==persistedSnapshot){const error=Error('The saved collection changed in another tab. Reload this page before continuing.');error.code='POSTER_STORAGE_CHANGED';throw error;}
 }
 async function exportBackup(){
  assertOpen();assertEditable();assertStorageCurrent();const fingerprint=collectionFingerprint(),backup=backupFromState(state);await decodeBackupImages(backup);assertOpen();assertEditable();assertStorageCurrent();
  if(fingerprint!==collectionFingerprint())throw Error('The collection changed. Export the backup again.');
  return JSON.stringify(backup);
 }
 async function prepareImport(text){
  assertOpen();assertEditable();assertStorageCurrent();const fingerprint=collectionFingerprint(),backup=parseBackup(text);
  await decodeBackupImages(backup);assertOpen();assertEditable();assertStorageCurrent();
  if(fingerprint!==collectionFingerprint())throw Error('The collection changed. Preview the backup again.');
  const merged=mergeBackup(state,backup,catalog.posters.map(p=>p.id));const plan=Object.freeze({summary:merged.summary});
  importPlans.set(plan,{fingerprint,backup});return plan;
 }
 function applyImport(plan){
  assertOpen();assertEditable();const prepared=importPlans.get(plan);if(!prepared)throw Error('This import plan is invalid or already used. Preview the backup again.');
  assertStorageCurrent();if(prepared.fingerprint!==collectionFingerprint()){importPlans.delete(plan);throw Error('The collection changed. Preview the backup again.');}
  const merged=mergeBackup(state,prepared.backup,catalog.posters.map(p=>p.id)),nextState={...state,custom:merged.custom,pinned:merged.pinned};
  // localStorage.setItem is atomic. Publish the new in-memory state only after it succeeds.
  try{const serialized=JSON.stringify(nextState);localStorage.setItem('portfolio-studio-posters-v1',serialized);persistedSnapshot=serialized;stored=true;lastSaveFailure=null;state=nextState}
  catch{stored=false;reportStatus('Browser storage is unavailable or full. The backup was not merged.');throw Error('Browser storage is full or unavailable. Nothing was changed; the backup was not saved.');}
  importPlans.delete(plan);return merged.summary;
 }
 function all(){return [...catalog.posters,...state.custom]}
 function pool(){const list=all().filter(p=>!state.hidden.includes(p.id));if(state.mode==='curated')return list.filter(p=>state.pinned.includes(p.id)||p.custom);if(state.mode==='originals')return list.filter(p=>!p.custom);return list}
 function clearIneligible(list){
  if(current&&!list.some(p=>p.id===current.id)){generation++;current=null;onChange(null,null)}
 }
 async function display(p,isCurrentRequest=()=>true){
  if(disposed)return false;
  // Advance navigation when an image is requested, while keeping the wall until decoding succeeds.
  attemptedId=p?.id||null;
  if(!p){generation++;current=null;onChange(null,null);return true;}
  const token=++generation,img=new Image();img.src=p.image;
  try{await img.decode();if(disposed||token!==generation||!isCurrentRequest()||!all().some(x=>x.id===p.id))return false;current=p;onChange(p,img);return true}
  catch{if(!disposed&&token===generation&&isCurrentRequest())reportStatus('Could not load that image. The wall is unchanged.');return false}
 }
 async function next(){
  if(disposed)return false;
  const list=pool();
  if(!list.length){const token=generation+1;await display(null);if(!disposed&&token===generation)reportStatus('No posters in this selection yet. Switch to original prints to pin a poster, or add your own image.');return false}
  clearIneligible(list);
  const cursor=list.some(p=>p.id===attemptedId)?attemptedId:current?.id;
  return display(nextPoster(list,cursor));
 }
 async function refresh(){
  const request=++refreshGeneration,navigation=generation;
  try{
   const response=await fetch('./posters.json',{cache:'no-store'});if(!response.ok)throw Error('catalog');
   const fresh=validateCatalog(await response.json());if(disposed||request!==refreshGeneration)return;
   catalog=fresh;
   // Keep useful catalog data, but a later wall action owns its image and status.
   if(navigation!==generation)return;
   const list=pool();if(list.length)clearIneligible(list);
   const replacement=list.find(p=>p.id===current?.id)||list[Math.floor(Date.now()/86400000)%list.length]||null;
   if(!list.length||JSON.stringify(replacement)!==JSON.stringify(current)){
    const token=generation+1,loaded=await display(replacement,()=>request===refreshGeneration);
    if(!loaded||disposed||request!==refreshGeneration||token!==generation)return;
   }
   reportStatus(lastSaveFailure?.message||(stored?'Catalog checked. Preferences stay in this browser.':'Catalog checked. Browser storage is unavailable; your choices may be session-only.'));
  }catch{if(disposed||request!==refreshGeneration||navigation!==generation)return;reportStatus('Catalog unavailable. Keeping the original studio print.')}
 }
 function assertPinCapacity(){if(new Set(state.pinned).size>=BACKUP_LIMITS.maxPins)throw Error('This browser collection holds up to 112 pins. Unpin a poster before adding another.');}
 function togglePin(id){if(!allowChanges())return false;if(!id)return;if(!state.pinned.includes(id)){try{assertPinCapacity()}catch(error){reportStatus(error.message);return false}}generation++;state.pinned=state.pinned.includes(id)?state.pinned.filter(x=>x!==id):[...state.pinned,id];save();if(state.mode==='curated'&&current&&!pool().some(p=>p.id===current.id))next()}
 async function hide(id){if(!allowChanges())return false;generation++;state.hidden=[...new Set([...state.hidden,id])];save();if(current?.id===id)await next()}
 async function add(file,title){
  assertOpen();assertEditable();
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a JPG, PNG, or WebP under 10 MB.');
  if(state.custom.length>=BACKUP_LIMITS.maxImages)throw Error('This browser collection holds up to 12 images.');
  assertPinCapacity();
  const url=URL.createObjectURL(file);
  try{
   const img=new Image();img.src=url;await img.decode();assertOpen();
   if(!img.width||!img.height||img.width*img.height>60000000)throw Error('Choose an image below 60 megapixels.');
   const c=document.createElement('canvas'),scale=Math.min(1,1000/Math.max(img.width,img.height));
   c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);
   const plainTitle=value=>typeof value==='string'?value.replace(/\s+/g,' ').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim().slice(0,BACKUP_LIMITS.maxTextLength).trim():'';
   const label=plainTitle(title)||plainTitle(file.name.replace(/\.[^.]+$/,''))||'Untitled poster';
   const p={id:'custom-'+crypto.randomUUID(),custom:true,title:label,alt:label,credit:'My collection',rights:'Your image, stored in this browser only.',image:c.toDataURL('image/jpeg',.8)};
   const encoded=p.image.slice(p.image.indexOf(',')+1),imageBytes=encoded.length/4*3-(encoded.endsWith('==')?2:encoded.endsWith('=')?1:0);
   if(imageBytes>BACKUP_LIMITS.maxImageBytes)throw Error('This image is too large to back up. Choose a simpler image, up to 1 MiB after resizing.');
   // Decoding yields: another upload or backup merge may have consumed either final slot.
   if(state.custom.length>=BACKUP_LIMITS.maxImages)throw Error('This browser collection holds up to 12 images.');
   assertPinCapacity();
   state.custom.push(p);state.pinned.push(p.id);
   if(!save()){const failure=lastSaveFailure;state.custom.pop();state.pinned=state.pinned.filter(id=>id!==p.id);if(failure?.code==='POSTER_STORAGE_CHANGED')throw failure;throw Error('Browser storage is full or unavailable. This image was not saved.')}
   if(state.mode==='originals'){state.mode='mixed';save()}
   await display(p);return p;
  }finally{URL.revokeObjectURL(url)}
 }

 current=pool()[0]||null;attemptedId=current?.id||null;
 const interval=setInterval(()=>{if(!document.hidden&&!state.paused&&!editing&&pool().length>1)next()},60000);
 const refreshInterval=setInterval(()=>{if(!document.hidden)refresh()},300000);
 addEventListener('focus',refresh);
 return {setEditing(value){editing=value},get current(){return current},get state(){return state},get stored(){return stored},all,pool,display,next,refresh,togglePin,hide,add,exportBackup,prepareImport,applyImport,setMode(mode){if(!allowChanges())return false;if(['mixed','originals','curated'].includes(mode)){generation++;state.mode=mode;save();next()}},togglePause(){if(!allowChanges())return false;state.paused=!state.paused;save()},restore(){if(!allowChanges())return false;state.hidden=[];save();if(!current)next()},remove(id){if(!allowChanges())return false;generation++;state.custom=state.custom.filter(p=>p.id!==id);state.pinned=state.pinned.filter(x=>x!==id);save();if(current?.id===id)next()},dispose(){disposed=true;generation++;refreshGeneration++;clearInterval(interval);clearInterval(refreshInterval);removeEventListener('focus',refresh)}};
}
