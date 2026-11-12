// Manual real-React browser regression builder. Run from the repository:
// node tests/build-scene-allocation-fixture.cjs /absolute/new-output-directory
// Serve only generated dist with an approved static preview. Click each control and
// wait for status to settle. Ordinary mount: factory/Scene/Color counts1/3/1 stay
// unchanged through parent/progress/completion; remount makes2/6/2 and aborts prior
// manager. Identity flags stay true; completion receives the known action array.
// No StrictMode, actual GPU, full-app, timing or memory measurement is implied.
const fs=require('fs'),path=require('path'),ts=require('typescript'),crypto=require('crypto');
const repo=path.resolve(__dirname,'..');
if(!process.argv[2] || !path.isAbsolute(process.argv[2])) throw Error('absolute fresh output directory required');
const out=process.argv[2];fs.mkdirSync(out,{mode:0o700});fs.mkdirSync(path.join(out,'dist'),{mode:0o700});fs.mkdirSync(path.join(out,'.openai'),{mode:0o700});
const scenePath=path.join(repo,'apps/web/components/scene-loader/SceneLoader.tsx');
const factoryPath=path.join(repo,'apps/web/components/scene-loader/AssetLoaders.ts');
function extract(file,name){const s=fs.readFileSync(file,'utf8'),a=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const n=a.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);if(!n)throw Error('missing '+name);return n.getText(a).replace(/^export /,'');}
const scene=extract(scenePath,'SceneLoader');const factory=extract(factoryPath,'createRenderScenes').replace('function createRenderScenes','function actualCreateRenderScenes');
const prelude=`import React, { useEffect, useState, useRef } from 'react';
import {createRoot} from 'react-dom/client';
const state={factoryCalls:0,sceneConstructions:0,colorConstructions:0,managerRecords:[],rendererRecords:[],parentRenders:0};
class Scene { constructor(){this.id=++state.sceneConstructions;} clear(){} }
class Color { constructor(value){this.value=value;state.colorConstructions++;} }
${factory}
function createRenderScenes(){state.factoryCalls++;return actualCreateRenderScenes();}
const knownActions=[()=>{}];
const ids=s=>[s.sourceScene.id,s.cutoutScene.id,s.cssScene.id];
class LoadingManager{}
class AssetManager {
 constructor(scenes){this.scenes=scenes;this.record={ids:ids(scenes),aborted:false,progress:0};state.managerRecords.push(this.record);state.active=this;}
 init(){} reset(){} add(){} loadingProgress(){return {isDoneLoading:()=>false};}
 load(signal,callback){this.signal=signal;this.callback=callback;signal.addEventListener('abort',()=>{this.record.aborted=true;});return new Promise(resolve=>{this.resolve=resolve;});}
 complete(){this.resolve({updateActions:knownActions});}
 progress(){this.record.progress++;this.callback();}
}
const detectWebGL=()=>true,isDebug=()=>false,isMobileDevice=()=>false;
const NoopLoader=()=>({}),DeskLoader=NoopLoader,CablesLoader=NoopLoader,MouseLoader=NoopLoader,LightsLoader=NoopLoader,FloorLoader=NoopLoader,PlantLoader=NoopLoader,HydraLoader=NoopLoader,KeyboardLoader=NoopLoader,MonitorLoader=NoopLoader;
function Renderer(props){state.renderedScenes=props.scenes;state.rendererRecords.push(ids(props.scenes));state.renderedLoading=props.loading;state.renderedActionCount=props.actions.length;state.renderedKnownActions=props.actions===knownActions;return <p>Controlled Renderer scene IDs: {ids(props.scenes).join(',')}</p>;}
const DisplayLoadingProgress=()=> <p>Controlled pending assets</p>,LoadingUnderscore=()=>null,ShowUserMessage=()=>null,DisplayWebGLError=()=>null,DisplaySceneLoadError=()=>null;
${scene}
function report(){const active=state.active;document.getElementById('status').textContent=JSON.stringify({factoryCalls:state.factoryCalls,sceneConstructions:state.sceneConstructions,colorConstructions:state.colorConstructions,parentRenders:state.parentRenders,loading:state.renderedLoading,actionCount:state.renderedActionCount,knownActionsIdentity:state.renderedKnownActions,managers:state.managerRecords,latestRendererIds:state.rendererRecords.at(-1),activeManagerIds:active?.record.ids,identityMatches:!!active&&state.renderedScenes===active.scenes,sourceIdentityMatches:!!active&&state.renderedScenes.sourceScene===active.scenes.sourceScene,cutoutIdentityMatches:!!active&&state.renderedScenes.cutoutScene===active.scenes.cutoutScene,cssIdentityMatches:!!active&&state.renderedScenes.cssScene===active.scenes.cssScene},null,2);}
function afterCommit(){requestAnimationFrame(()=>requestAnimationFrame(report));}
function App(){const [tick,setTick]=useState(0),[generation,setGeneration]=useState(0);state.parentRenders++;useEffect(afterCommit,[tick,generation]);return <><p>Actual ReactDOM/hooks and extracted SceneLoader/factory. Controlled asset/GPU boundaries; ordinary mount only, no StrictMode or performance measurements.</p><button onClick={()=>{setTick(n=>n+1);afterCommit();}}>Parent rerender</button><button onClick={()=>{state.active.progress();afterCommit();}}>Asset progress</button><button onClick={()=>{state.active.complete();afterCommit();}}>Complete loading</button><button onClick={()=>{setGeneration(n=>n+1);afterCommit();}}>Remount</button><SceneLoader key={generation}/></>;}
createRoot(document.getElementById('root')).render(<App/>);afterCommit();
`;
const js=ts.transpileModule(prelude,{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;fs.writeFileSync(path.join(out,'fixture-entry.js'),js,{mode:0o600});

fs.writeFileSync(path.join(out,'dist/index.html'),'<!doctype html><meta charset="utf-8"><title>Scene allocation candidate diagnostic</title><h1>Scene allocation: candidate diagnostic</h1><p>SceneLoader SHA-256: ' + crypto.createHash('sha256').update(fs.readFileSync(scenePath)).digest('hex') + '</p><div id="root"></div><pre id="status" aria-live="polite">Waiting for React commit</pre><script src="bundle.js"></script>',{mode:0o600});
fs.writeFileSync(path.join(out,'.openai/hosting.json'),JSON.stringify({static:{directory:'dist'}}),{mode:0o600});
const webpack=require('webpack');webpack({mode:'development',devtool:false,entry:path.join(out,'fixture-entry.js'),output:{path:path.join(out,'dist'),filename:'bundle.js'},resolve:{modules:[path.join(repo,'node_modules')]},optimization:{minimize:false},performance:{hints:false}},(err,stats)=>{
 if(err){console.error(err);process.exitCode=1;return;}
 console.log(stats.toString({all:false,errors:true,warnings:true,assets:true}));
 if(stats.hasErrors()){process.exitCode=1;return;}
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const files=['dist/index.html','dist/bundle.js','.openai/hosting.json','fixture-entry.js'].map(p=>({path:p,size:fs.statSync(path.join(out,p)).size,sha256:hash(path.join(out,p))}));
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({sources:[scenePath,factoryPath,__filename].map(p=>({path:path.relative(repo,p),sha256:hash(p)})),files,scope:'Actual extracted SceneLoader/factory, real ReactDOM; controlled Scene/Color/asset/Renderer boundaries. Strict object/member identity. Settle status after each click; frame scheduling is not a formal commit guarantee. No StrictMode/GPU/performance proof.'},null,2),{mode:0o600});
});
