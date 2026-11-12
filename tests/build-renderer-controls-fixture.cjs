// Manual browser regression: node tests/build-renderer-controls-fixture.cjs /absolute/new-output
// Use approved static preview. Tab/Enter sound => disable; Space => enable.
// Tab/Enter camera => MonitorView; Space => Cinematic. Inspect actual accessible
// names after each action. Controlled service dispatch only, not media/GPU proof.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),webpack=require('webpack');
const {code}=require('./renderer-controls-source.cjs');
const repo=path.resolve(__dirname,'..'),out=process.argv[2];
if(!out||!path.isAbsolute(out))throw Error('absolute fresh output required');
fs.mkdirSync(out,{mode:0o700});fs.mkdirSync(path.join(out,'dist'),{mode:0o700});fs.mkdirSync(path.join(out,'dist/icons'),{mode:0o700});fs.mkdirSync(path.join(out,'.openai'),{mode:0o700});
fs.writeFileSync(path.join(out,'controls.js'),code(),{mode:0o600});
const entry=`const React=require('react');const {createRoot}=require('react-dom/client');
const {useSoundManagement,SoundManagementButton,ChangeSceneButton,CameraHandlerState:State}=require('./controls.js');
const soundCalls=[],cameraCalls=[];const soundService={enable(){soundCalls.push('enable');},disable(){soundCalls.push('disable');}};
function App(){const sound=useSoundManagement(soundService);const [view,setView]=React.useState(State.Cinematic);const handler=React.useRef({changeState(target){cameraCalls.push(target);setView(target);}});const target=view===State.Cinematic?State.MonitorView:State.Cinematic;
return React.createElement(React.Fragment,null,React.createElement(SoundManagementButton,{sound}),React.createElement(ChangeSceneButton,{targetState:target,cameraHandler:handler}),React.createElement('pre',{id:'status','aria-live':'polite'},JSON.stringify({hookSoundEnabled:sound.isSoundEnabled,soundCalls,cameraCalls,currentView:State[view],targetView:State[target]},null,2)));}
createRoot(document.getElementById('root')).render(React.createElement(App));`;
fs.writeFileSync(path.join(out,'entry.js'),entry,{mode:0o600});
const sourcePaths=['apps/web/components/renderer/RendererUI.tsx','apps/web/components/renderer/RendererUI.module.css','apps/web/components/renderer/camera/CameraHandler.ts','tests/renderer-controls-source.cjs','tests/build-renderer-controls-fixture.cjs'];
for(const name of ['mute-icon.svg','unmute-icon.svg','camera.svg']){const rel='apps/web/public/icons/'+name;sourcePaths.push(rel);fs.copyFileSync(path.join(repo,rel),path.join(out,'dist/icons',name));}
fs.copyFileSync(path.join(repo,'apps/web/components/renderer/RendererUI.module.css'),path.join(out,'dist/controls.css'));
fs.writeFileSync(path.join(out,'dist/index.html'),'<!doctype html><meta charset="utf-8"><title>Renderer control accessibility diagnostic</title><link rel="stylesheet" href="controls.css"><h1>Candidate control accessibility diagnostic</h1><p>Actual extracted buttons and sound hook with real React. Controlled sound/camera dispatch only; no media, GPU or full scene.</p><div id="root"></div><script src="bundle.js"></script>',{mode:0o600});
fs.writeFileSync(path.join(out,'.openai/hosting.json'),JSON.stringify({static:{directory:'dist'}}),{mode:0o600});
webpack({mode:'development',devtool:false,entry:path.join(out,'entry.js'),output:{path:path.join(out,'dist'),filename:'bundle.js'},resolve:{modules:[path.join(repo,'node_modules')]},optimization:{minimize:false},performance:{hints:false}},(err,stats)=>{
 if(err){console.error(err);process.exitCode=1;return;}console.log(stats.toString({all:false,errors:true,warnings:true,assets:true}));if(stats.hasErrors()){process.exitCode=1;return;}
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const files=['dist/index.html','dist/bundle.js','dist/controls.css','dist/icons/mute-icon.svg','dist/icons/unmute-icon.svg','dist/icons/camera.svg','.openai/hosting.json','entry.js','controls.js'].map(p=>({path:p,size:fs.statSync(path.join(out,p)).size,sha256:hash(path.join(out,p))}));
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({sources:sourcePaths.map(p=>({path:p,sha256:hash(path.join(repo,p))})),files,scope:'Real React buttons and actual sound hook, controlled service/camera calls; not actual audibility/service synchronization, GPU or full-app behavior.'},null,2),{mode:0o600});
});
