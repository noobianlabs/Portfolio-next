// This format contains browser-local images and pins only. No URLs are fetched.
export const MAX_BACKUP_BYTES=8*1024*1024;
export const BACKUP_LIMITS=Object.freeze({maxBytes:MAX_BACKUP_BYTES,maxImages:12,maxImageBytes:1024*1024,maxDimension:2000,maxPixels:4000000,maxPins:112,maxIdLength:80,maxTextLength:160});
const FORMAT='studio-poster-collection';
const IMAGE_KEYS=['id','title','alt','image'];
function fail(message){throw Error(message)}
function exactObject(value,keys,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(key=>!Object.hasOwn(value,key)))fail(`Invalid ${label}: unexpected or missing fields.`);
}
function id(value,custom=false){
 if(typeof value!=='string'||value.length>BACKUP_LIMITS.maxIdLength||!(/^[A-Za-z0-9][A-Za-z0-9_-]*$/).test(value)||(custom&&!value.startsWith('custom-')))fail('Invalid poster ID in backup.');
 return value;
}
function plainText(value,label){
 if(typeof value!=='string'||value.length>BACKUP_LIMITS.maxTextLength)fail(`Invalid ${label}: use at most 160 characters.`);
 const clean=value.replace(/\s+/g,' ').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,'').trim();
 if(!clean)fail(`Invalid ${label}: text is required.`);
 return clean;
}
function dimensions(width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>BACKUP_LIMITS.maxDimension||height>BACKUP_LIMITS.maxDimension||width*height>BACKUP_LIMITS.maxPixels)fail('Image dimensions must be at most 2000 pixels per side and 4 megapixels.');
 return {width,height};
}
function rasterDimensions(bytes,mime){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),length=bytes.length;
 const tag=(offset,count=4)=>String.fromCharCode(...bytes.subarray(offset,offset+count));
 if(mime==='png'){
  if(length<45||tag(0,8)!=='\x89PNG\r\n\x1a\n'||view.getUint32(8)!==13||tag(12)!=='IHDR')fail('Invalid PNG image signature.');
  const size=dimensions(view.getUint32(16),view.getUint32(20));let offset=8,hasPixels=false,ended=false;
  while(offset+12<=length){const count=view.getUint32(offset),kind=tag(offset+4);if(count>length-offset-12)fail('Truncated PNG image.');if(kind==='acTL')fail('Animated images are not supported in backups.');if(kind==='IDAT')hasPixels=true;if(kind==='IEND'){if(count!==0||offset+12!==length)fail('Invalid PNG image ending.');ended=true;break}offset+=count+12}
  if(!ended||!hasPixels)fail('Incomplete PNG image.');return size;
 }
 if(mime==='jpeg'){
  if(length<12||bytes[0]!==255||bytes[1]!==216||bytes[length-2]!==255||bytes[length-1]!==217)fail('Invalid JPEG image signature.');
  let offset=2,size=null;
  while(offset+3<length){
   if(bytes[offset++]!==255)fail('Invalid JPEG image structure.');while(bytes[offset]===255)offset++;const marker=bytes[offset++];
   if(marker===0xda){if(!size)fail('JPEG image dimensions are missing.');return size}
   if(marker===0xd9)break;if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
   if(offset+2>length)break;const count=view.getUint16(offset);if(count<2||offset+count>length)fail('Truncated JPEG image.');
   if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){if(count<8)fail('Invalid JPEG dimensions.');size=dimensions(view.getUint16(offset+5),view.getUint16(offset+3))}
   offset+=count;
  }
  fail('Incomplete JPEG image.');
 }
 if(mime==='webp'){
  if(length<30||tag(0)!=='RIFF'||tag(8)!=='WEBP'||view.getUint32(4,true)!==length-8)fail('Invalid WebP image signature.');
  let offset=12,size=null,canvas=null;
  while(offset+8<=length){
   const kind=tag(offset),count=view.getUint32(offset+4,true),start=offset+8;if(count>length-start)fail('Truncated WebP image.');
   if(kind==='ANIM'||kind==='ANMF')fail('Animated images are not supported in backups.');
   if(kind==='VP8X'){if(count!==10||(bytes[start]&2))fail('Animated or invalid WebP image.');const u24=at=>bytes[at]+bytes[at+1]*256+bytes[at+2]*65536;canvas=dimensions(u24(start+4)+1,u24(start+7)+1)}
   if(kind==='VP8 '){if(count<10||tag(start+3,3)!=='\x9d\x01\x2a')fail('Invalid WebP raster.');size=dimensions(view.getUint16(start+6,true)&0x3fff,view.getUint16(start+8,true)&0x3fff)}
   if(kind==='VP8L'){if(count<5||bytes[start]!==0x2f)fail('Invalid WebP raster.');size=dimensions(1+bytes[start+1]+((bytes[start+2]&0x3f)<<8),1+(bytes[start+2]>>6)+(bytes[start+3]<<2)+((bytes[start+4]&0x0f)<<10))}
   offset=start+count+(count%2);
  }
  if(offset!==length||!size||(canvas&&(size.width!==canvas.width||size.height!==canvas.height)))fail('Invalid WebP image dimensions.');return size;
 }
 fail('Use a local PNG, JPEG, or WebP image.');
}
export function inspectBackupImage(value){
 if(typeof value!=='string')fail('Invalid local image in backup.');
 const prefix=/^data:image\/(png|jpeg|webp);base64,/.exec(value);if(!prefix)fail('Backups accept only local base64 PNG, JPEG, or WebP images.');
 const encoded=value.slice(prefix[0].length);
 if(encoded.length>Math.ceil(BACKUP_LIMITS.maxImageBytes/3)*4)fail('Each backup image must be at most 1 MiB.');
 if(!encoded.length||encoded.length%4!==0||!(/^[A-Za-z0-9+/]*={0,2}$/).test(encoded))fail('Invalid base64 image data.');
 let binary;try{binary=atob(encoded)}catch{fail('Invalid base64 image data.')}
 if(binary.length>BACKUP_LIMITS.maxImageBytes)fail('Each backup image must be at most 1 MiB.');
 if(btoa(binary)!==encoded)fail('Invalid base64 image data.');
 const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));return rasterDimensions(bytes,prefix[1]);
}
export function parseBackup(text){
 if(typeof text!=='string')fail('Choose a JSON collection backup.');
 if(text.length>MAX_BACKUP_BYTES||new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)fail('The backup file must be no larger than 8 MiB.');
 let value;try{value=JSON.parse(text)}catch{fail('This file is not valid JSON.')}
 exactObject(value,['format','version','images','pinned'],'collection backup');
 if(value.format!==FORMAT||value.version!==1)fail('Unsupported collection backup format or version.');
 if(!Array.isArray(value.images)||value.images.length>BACKUP_LIMITS.maxImages)fail('A backup can contain up to 12 custom images.');
 if(!Array.isArray(value.pinned)||value.pinned.length>BACKUP_LIMITS.maxPins)fail('A backup can contain up to 112 pinned IDs.');
 const ids=new Set(),pins=new Set();
 const images=value.images.map(image=>{
  exactObject(image,IMAGE_KEYS,'backup image');const imageId=id(image.id,true);if(ids.has(imageId))fail('Duplicate custom image ID in backup.');ids.add(imageId);
  const result={id:imageId,title:plainText(image.title,'title'),alt:plainText(image.alt,'alt text'),image:image.image};inspectBackupImage(result.image);return result;
 });
 const pinned=value.pinned.map(pin=>{id(pin);if(pins.has(pin))fail('Duplicate pinned ID in backup.');pins.add(pin);return pin});
 return {format:FORMAT,version:1,images,pinned};
}
export async function decodeBackupImages(backup){
 for(const record of backup.images){
  const expected=inspectBackupImage(record.image),image=new Image();let timer;
  try{
   image.src=record.image;
   await Promise.race([image.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Image validation timed out. Try a smaller image.')),10000)})]);
   const actual=dimensions(image.naturalWidth,image.naturalHeight);if(actual.width!==expected.width||actual.height!==expected.height)fail('Decoded image dimensions do not match the backup.');
  }catch(error){if(error.message?.includes('dimensions')||error.message?.includes('timed out'))throw error;fail('A backup image could not be decoded. No collection changes were made.')}
  finally{clearTimeout(timer)}
 }
}
export function backupFromState(state){
 if(!Array.isArray(state.custom)||!Array.isArray(state.pinned))fail('The current collection is invalid and cannot be exported.');
 // Deliberately omit runtime, catalog, source and unknown persisted fields.
 return parseBackup(JSON.stringify({format:FORMAT,version:1,images:state.custom.map(({id,title,alt,image})=>({id,title,alt,image})),pinned:state.pinned}));
}
export function mergeBackup(state,backup,catalogIds=[]){
 const existing=new Map(state.custom.map(image=>[image.id,image])),catalog=new Set(catalogIds),added=[];let existingImages=0;
 for(const image of backup.images){
  if(catalog.has(image.id))fail('A backup image ID conflicts with an original print.');
  const old=existing.get(image.id);
  if(old){if(old.image!==image.image||plainText(old.title,'existing title')!==image.title||plainText(old.alt,'existing alt text')!==image.alt)fail(`The backup conflicts with an existing image (${image.id}). Nothing was overwritten.`);existingImages++}
  else added.push({...image,custom:true,credit:'My collection',rights:'Your image, stored in this browser only.'});
 }
 const custom=[...state.custom,...added],pinned=[...new Set([...state.pinned,...backup.pinned])];
 if(custom.length>BACKUP_LIMITS.maxImages)fail('Merging would exceed the 12-image collection limit. Remove an image first.');
 if(pinned.length>BACKUP_LIMITS.maxPins)fail('Merging would exceed the 112-pin collection limit.');
 return {custom,pinned,summary:Object.freeze({newImages:added.length,existingImages,newPins:pinned.length-new Set(state.pinned).size,totalImages:custom.length,totalPins:pinned.length})};
}
