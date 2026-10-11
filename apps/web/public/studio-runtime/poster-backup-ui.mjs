import {BACKUP_LIMITS} from './poster-backup.mjs';

const pendingPreview=phase=>phase==='reading'||phase==='preparing';
const errorMessage=(error,fallback)=>typeof error?.message==='string'&&error.message?error.message:fallback;
const quantity=(count,noun)=>`${count} ${noun}${count===1?'':'s'}`;

// Create a local download without sending backup contents to a server.
export function downloadPosterBackup(text,{document=globalThis.document,URL=globalThis.URL,Blob=globalThis.Blob,schedule=globalThis.setTimeout}={}){
 const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob);
 let link;
 try{
  link=document.createElement('a');link.href=url;link.download='studio-poster-collection.json';link.hidden=true;
  document.body.append(link);link.click();
 }finally{
  link?.remove();schedule(()=>URL.revokeObjectURL(url),1000);
 }
}

export function createPosterBackupController({collection,onState=()=>{},onMerged=()=>{},download=downloadPosterBackup}){
 let state={phase:'idle',file:null,summary:null,exporting:false,message:''},plan=null,generation=0,exportGeneration=0;
 function update(changes){state={...state,...changes};onState(state)}
 function reset(message=''){generation++;exportGeneration++;plan=null;update({phase:'idle',file:null,summary:null,exporting:false,message})}
 const controller={
  get state(){return state},
  selectFile(file){
   if(state.phase==='merging'||state.exporting)return false;
   generation++;plan=null;
   update({phase:file?'selected':'idle',file:file||null,summary:null,message:file?'Choose Preview to check this local backup before merging.':''});return true;
  },
  async preview(){
   if(!state.file||state.exporting||pendingPreview(state.phase)||state.phase==='merging')return false;
   const token=++generation,file=state.file;plan=null;
   if(!Number.isFinite(file.size)||file.size<0||file.size>BACKUP_LIMITS.maxBytes){update({phase:'error',summary:null,message:'Choose a JSON backup no larger than 8 MiB.'});return false}
   update({phase:'reading',summary:null,message:'Reading the selected file locally…'});
   let text;
   try{text=await file.text()}catch(error){if(token!==generation)return false;update({phase:'error',message:'Could not read this file. '+errorMessage(error,'Choose the file again.')});return false}
   if(token!==generation)return false;
   update({phase:'preparing',message:'Checking the backup before merging…'});
   try{
    const prepared=await collection.prepareImport(text);
    if(token!==generation)return false;
    plan=prepared;
    update({phase:'preview',summary:prepared.summary,message:prepared.summary.newImages===0&&prepared.summary.newPins===0?'No new images or pins to add. Review the counts below.':'Preview ready. Review the counts below, then choose Merge.'});return true;
   }catch(error){
    if(token!==generation)return false;
    update({phase:'error',summary:null,message:errorMessage(error,'This file could not be previewed. Choose a valid collection backup.')});return false;
   }
  },
  async merge(){
   if(state.phase!=='preview'||!plan||state.exporting)return false;
   const confirmed=plan,summary=state.summary;plan=null;
   update({phase:'merging',message:'Merging into this browser. This confirmed merge cannot be cancelled.'});
   try{await collection.applyImport(confirmed)}catch(error){
    update({phase:'error',summary:null,message:errorMessage(error,'The backup could not be saved. Preview again before retrying.')});return false;
   }
   update({phase:'success',file:null,summary:null,message:summary.newImages===0&&summary.newPins===0?'Nothing new to add. This browser collection is unchanged.':`Merged into this browser: ${quantity(summary.newImages,'new image')} and ${quantity(summary.newPins,'new pin')}.`});
   onMerged(summary);return true;
  },
  cancel(){
   if(state.phase==='merging')return false;
   reset('Cancelled. Nothing was imported.');return true;
  },
  close(){
   // A confirmed atomic merge is already committed to running. Closing only
   // dismisses unconfirmed work; it never pretends to roll a merge back.
   if(state.phase==='merging'){generation++;exportGeneration++;return false}
   reset();return true;
  },
  async exportBackup(){
   if(state.exporting||pendingPreview(state.phase)||state.phase==='merging')return false;
   const token=++exportGeneration;update({exporting:true,message:'Preparing a local JSON backup…'});
   try{
    const text=await collection.exportBackup();
    if(token!==exportGeneration)return false;
    download(text);update({exporting:false,message:'Backup download started. Keep the JSON file somewhere safe.'});return true;
   }catch(error){
    if(token!==exportGeneration)return false;
    update({exporting:false,message:errorMessage(error,'The backup download could not be prepared.')});return false;
   }
  }
 };
 return controller;
}

export function createPosterBackupPanel({collection,document=globalThis.document,onMerged=()=>{},download=downloadPosterBackup}){
 const element=document.createElement('section');element.id='poster-backup';element.className='poster-backup';element.setAttribute('aria-labelledby','poster-backup-title');
 element.innerHTML='<h3 id="poster-backup-title">Back up this collection</h3><p id="poster-backup-help" class="caption">Download a local JSON backup of your custom images and pinned poster IDs. The backup excludes bundled original artwork, rotation and hidden-poster settings. Import a backup to merge it with this browser’s collection. This tool reads and creates files locally. Each site has its own browser collection. Your current browser settings are preserved.</p><div class="poster-backup-actions"><button type="button" id="poster-backup-export">Download backup</button></div><label for="poster-backup-file">Choose a backup JSON file</label><input id="poster-backup-file" type="file" accept=".json,application/json" aria-describedby="poster-backup-help poster-backup-limit"><p id="poster-backup-limit" class="caption">Maximum file size: 8 MiB. Preview before merging.</p><div class="poster-backup-actions"><button type="button" id="poster-backup-review">Preview</button><button type="button" id="poster-backup-cancel" hidden>Cancel</button></div><div id="poster-backup-preview" hidden><h4 id="poster-backup-preview-title" tabindex="-1">Review this merge</h4><dl class="poster-backup-counts"><div><dt>New images</dt><dd id="poster-backup-new-images">0</dd></div><div><dt>Images already here</dt><dd id="poster-backup-existing-images">0</dd></div><div><dt>New pins</dt><dd id="poster-backup-new-pins">0</dd></div></dl><p class="caption">Your current images and pins are kept. Merge adds only the new items shown above.</p><div class="poster-backup-actions"><button type="button" id="poster-backup-merge">Merge into this browser</button></div></div><p id="poster-backup-status" class="caption" tabindex="-1" role="status" aria-live="polite" aria-atomic="true"></p>';
 const get=id=>element.querySelector('#poster-backup-'+id),input=get('file'),preview=get('preview'),review=get('review'),merge=get('merge'),cancel=get('cancel'),exportButton=get('export'),status=get('status');
 let previousPhase='idle',restoreMergeFocus=false;
 function render(state){
  const pending=pendingPreview(state.phase),merging=state.phase==='merging',focused=document.activeElement;
  const canFocusPreview=!focused||focused===document.body||focused===review||focused.disabled;
  if(merging&&previousPhase!=='merging')restoreMergeFocus=focused===merge;
  input.disabled=merging||state.exporting;
  if(!state.file)input.value='';
  review.disabled=!state.file||pending||merging||state.exporting||state.phase==='preview';
  exportButton.disabled=pending||merging||state.exporting;
  exportButton.textContent=state.exporting?'Preparing backup…':'Download backup';
  cancel.hidden=!state.file&&!state.exporting;cancel.disabled=merging;
  preview.hidden=!state.summary;merge.disabled=state.phase!=='preview'||state.exporting;
  element.setAttribute('aria-busy',pending||merging||state.exporting?'true':'false');
  if(state.summary){get('new-images').textContent=String(state.summary.newImages);get('existing-images').textContent=String(state.summary.existingImages);get('new-pins').textContent=String(state.summary.newPins)}
  status.textContent=state.message;
  // Enter on Preview must never turn into an accidental second Enter on Merge.
  // Keep any usable control the user chose while the async preview was pending.
  if(state.phase==='preview'&&previousPhase!=='preview'&&canFocusPreview)get('preview-title').focus();
  if(previousPhase==='merging'&&!merging){
   if(restoreMergeFocus&&(focused===merge||focused===document.body||!focused))status.focus();
   restoreMergeFocus=false;
  }
  previousPhase=state.phase;
 }
 const controller=createPosterBackupController({collection,onState:render,onMerged,download});
 input.onchange=()=>controller.selectFile(input.files?.[0]||null);
 review.onclick=()=>controller.preview();merge.onclick=()=>controller.merge();exportButton.onclick=()=>controller.exportBackup();
 cancel.onclick=()=>{if(controller.cancel())input.focus()};
 render(controller.state);
 return {element,controller,close(){restoreMergeFocus=false;return controller.close()}};
}
