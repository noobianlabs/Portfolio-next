import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
function select(file,names){const text=fs.readFileSync(new URL(file,import.meta.url),'utf8');const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const nodes=ast.statements.filter(n=>(ts.isFunctionDeclaration(n)||ts.isEnumDeclaration(n))&&names.includes(n.name?.text));assert.equal(nodes.length,names.length);return nodes.map(n=>n.getText(ast)).join('\n');}
const declarations=select('../apps/web/components/renderer/RendererUI.tsx',['NameAndTime'])+'\n'+select('../apps/web/components/renderer/util.ts',['writeOutCharsStreaming'])+'\n'+select('../apps/web/components/renderer/camera/CameraHandler.ts',['CameraHandlerState']);
const code=ts.transpileModule(declarations+'\nmodule.exports={NameAndTime,CameraHandlerState};',{compilerOptions:{target:ts.ScriptTarget.ES2015,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
// Actual component/effect/utility code, controlled hook storage, Date and timers.
// This executes lifecycle callbacks deterministically; it is not React StrictMode.
function fixture(){
 let now=0,next=0,cursor=0;const jobs=new Map(),slots=[],effects=[],updates=[];
 const schedule=(fn,delay,repeat=false)=>{const id=++next;jobs.set(id,{fn,at:now+delay,delay,repeat});return id;};
 const clear=id=>jobs.delete(id);
 const hooks={useRef(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;updates.push({at:now,slot:i,value:slots[i]});}];},useEffect(fn,deps){const i=cursor++;const prev=effects[i];const changed=!prev||!deps||deps.some((v,k)=>!Object.is(v,prev.deps[k]));effects[i]={fn,deps,cleanup:prev?.cleanup,changed};}};
 const module={exports:{}};
 class Clock extends Date{constructor(){super(Date.UTC(2020,0,1,12,0,0)+now);}getHours(){return this.getUTCHours();}getMinutes(){return this.getUTCMinutes();}getSeconds(){return this.getUTCSeconds();}}
 runInNewContext(code,{module,exports:module.exports,require,...hooks,Date:Clock,MStoWriteChar:35,styles:{},joinStyles:()=>'',SoundManagementButton:()=>null,ChangeSceneButton:()=>null,setTimeout:(fn,delay)=>schedule(fn,delay),clearTimeout:clear,setInterval:(fn,delay)=>schedule(fn,delay,true),clearInterval:clear});
 const {NameAndTime,CameraHandlerState:State}=module.exports;
 function render(state){cursor=0;NameAndTime({state,cameraHandler:{current:null},sound:{isSoundEnabled:true,toggleSound(){}}});for(const e of effects)if(e?.changed){e.cleanup?.();e.cleanup=e.fn();e.changed=false;}}
 function cleanup(){for(const e of effects)e?.cleanup?.();}
 function replay(){cleanup();for(const e of effects)if(e)e.cleanup=e.fn();}
 function advance(target){let count=0;for(;;){const entry=[...jobs].filter(([,j])=>j.at<=target).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!entry)break;assert.ok(count++<1000,'bounded timers');const [id,j]=entry;now=j.at;if(j.repeat)j.at+=j.delay;else jobs.delete(id);j.fn();}now=target;}
 return {render,cleanup,replay,advance,State,jobs,updates,reuseExpired(id,fn){assert.ok(!jobs.has(id));jobs.set(id,{fn,at:10000,repeat:false});},queued:()=>[...jobs.values()].map(j=>j.fn)};
}
test('inactive mount schedules nothing; first FreeRoam preserves typing, completion and clock cadence across camera changes',()=>{
 const f=fixture();f.render(f.State.Cinematic);assert.equal(f.jobs.size,0);f.render(f.State.FreeRoam);f.advance(0);assert.deepEqual(f.updates.map(x=>x.value),['A']);f.advance(100);f.render(f.State.MonitorView);f.render(f.State.FreeRoam);f.advance(1400);
 assert.equal(f.updates.filter(x=>x.value==='A').length,1);assert.ok(f.updates.some(x=>x.value==='Abdullah Saleh'&&x.at===455));assert.ok(f.updates.some(x=>x.value==='people > profit'&&x.at===1015));assert.ok(f.updates.some(x=>x.value==='12:00:01'&&x.at===1330));assert.ok(f.updates.some(x=>x.value===true&&x.at===1400));assert.equal(f.jobs.size,1);f.advance(2365);assert.equal(f.updates.at(-1).value,'12:00:02');f.cleanup();
});
for(const at of [0,200,1400,2400])test('lifetime cleanup at '+at+'ms removes delayed writers and clock without later updates',()=>{
 const f=fixture();f.render(f.State.FreeRoam);if(at)f.advance(at);const before=f.updates.length;f.cleanup();f.cleanup();assert.equal(f.jobs.size,0);f.advance(6000);assert.equal(f.updates.length,before);
});
for(const at of [0,200,1400])test('already queued callbacks are harmless after lifetime cleanup at '+at+'ms',()=>{
 const f=fixture();f.render(f.State.FreeRoam);if(at)f.advance(at);const queued=f.queued(),before=f.updates.length;f.cleanup();for(const fn of queued)fn();assert.equal(f.updates.length,before);assert.equal(f.jobs.size,0);
});
test('controlled setup-cleanup-setup replay leaves exactly one sequence and clock',()=>{
 const f=fixture();f.render(f.State.FreeRoam);f.replay();f.advance(1400);assert.equal(f.updates.filter(x=>x.value==='A').length,1);assert.equal(f.updates.filter(x=>x.value===true).length,1);assert.equal(f.jobs.size,1);f.advance(3365);assert.deepEqual(f.updates.filter(x=>x.at>=2365).map(x=>[x.at,x.value]),[[2365,'12:00:02'],[3365,'12:00:03']]);f.cleanup();assert.equal(f.jobs.size,0);
});

test('cleanup does not clear independent work reusing an expired owned timer ID',()=>{
 const f=fixture();let external=0;f.render(f.State.FreeRoam);f.advance(0);f.reuseExpired(1,()=>external++);f.cleanup();assert.equal(f.jobs.size,1);f.advance(10000);assert.equal(external,1);assert.equal(f.jobs.size,0);
});
