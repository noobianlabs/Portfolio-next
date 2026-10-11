import { mountPosterUI } from './poster-ui.mjs';
import * as THREE from 'three';
import { createComputerSession, projectScreen } from './computer-state.mjs';
import { createRenderGate } from './render-state.mjs';
import { createPortfolioLoadController } from './portfolio-load.mjs';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const $=s=>document.querySelector(s), world=$('#world'), dialog=$('#details');
let posterUI,posterMesh,posterLabelMesh;
let renderer,scene,camera,controls,room,raycaster,blueprintURL,lightOn=true,walking=false,yaw=0,pitch=0,targetView=null,lastFocus=null;
let blueprintCanvas,blueprintPreviewAttempted=false;
const computerSession=createComputerSession();let screenMesh,expanded=false,historyOwned=false,historyReturning=false;
const screenCenter=new THREE.Vector3(.62,2.08,-.67),screenSize={w:1.50,h:1.15};
const keys=new Set(), interactables=[], hotspots=[];let lastTime=performance.now(), ready=false;
const renderGate=createRenderGate();
// Keep the live query so preference changes affect both new and pending moves.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const views={room:{pos:[6.9,5.3,8.6],target:[0,1.0,-.8]},desk:{pos:[2.6,3.6,3.4],target:[0,1.3,0]},poster:{pos:[2.1,2.2,.2],target:[1.3,2.2,-3.3]}};
function details(kind){
 if(kind==='computer'){enterComputer();return;}
 if(computerSession.active)return;
 if(kind==='poster'&&posterUI){posterUI.open();return;}
 if(kind==='blueprint'&&blueprintCanvas&&!blueprintPreviewAttempted){
  // The table already owns this canvas. Encode its detail preview only once,
  // keeping the textual details available if the optional image cannot encode.
  blueprintPreviewAttempted=true;
  try{blueprintURL=blueprintCanvas.toDataURL('image/png');}
  catch(error){console.warn('Blueprint preview unavailable',error);}
 }
 const content={
 blueprint:`<span class="detail-kicker">01 / THE DRAFTING TABLE</span><h2 id="detail-title" class="detail-title">From study<br>to shared space.</h2><p>A working concept for a community library and garden. Charcoal paper, ivory structure, orange marks for what comes next.</p>${blueprintURL?`<img class="plan-img" src="${blueprintURL}" alt="Concept plan showing a reading room, circular assembly area, garden beds, seed storage, and a water tank">`:''}<p class="caption">An imagined concept plan, not a construction drawing or approved project.</p><h3>Portfolio work</h3><a class="project" href="/portfolio#projects" target="_blank" rel="noopener noreferrer"><strong>Software, advocacy & community</strong><span>Explore selected projects and the practice behind them.</span></a>`,
 poster:`<span class="detail-kicker">02 / ON THE WALL</span><h2 id="detail-title" class="detail-title">Study. Organize.<br>Build.</h2><p>Studio print No. 01 · Original geometric artwork</p><img class="poster-img" src="./assets/study-organize-build.svg" alt="Cream, forest green, and orange geometric print reading Study, Organize, Build"><p>Three verbs for a working room. A circle, an open grid, and a growing structure connect attention, shared effort, and making.</p><p class="caption">Original artwork created for this studio.</p>`,
 books:`<span class="detail-kicker">03 / THE READING CORNER</span><h2 id="detail-title" class="detail-title">Study that<br>returns to practice.</h2><p>Three short prompts to carry from the bookshelf to the drafting table.</p><div class="note"><h3>Read the conditions</h3><p>What is actually happening here? Start with the people, land, resources, and constraints in front of you.</p></div><div class="note"><h3>Build collective capacity</h3><p>Who can help shape the work? What knowledge and decisions should be shared rather than held by one person?</p></div><div class="note"><h3>Try, observe, revise</h3><p>Choose a small practical experiment. Record what changed, listen to the people affected, then redraw the plan.</p></div><p class="caption">Original working prompts for this studio.</p><a class="project" href="/portfolio#projects" target="_blank" rel="noopener noreferrer"><strong>Explore selected work</strong><span>Read the portfolio in a separate tab.</span></a>`,
 help:`<span class="detail-kicker">FIND YOUR WAY AROUND</span><h2 id="detail-title" class="detail-title">A little room<br>to explore.</h2><p>Choose a view, move around, and select an object. The numbered buttons also work without touching the 3D scene.</p><div class="shortcut"><span>Orbit / look</span><span>Drag · one finger</span></div><div class="shortcut"><span>Zoom</span><span>Scroll · pinch · + / −</span></div><div class="shortcut"><span>Pan</span><span>Right drag · two fingers</span></div><div class="shortcut"><span>Walk</span><span>W A S D · arrow keys · pad</span></div><div class="shortcut"><span>Inspect an object</span><span>Click · tap · object buttons</span></div><div class="shortcut"><span>Reset the room</span><span>R · reset button</span></div><div class="shortcut"><span>Close a detail</span><span>Escape</span></div><p class="caption">Walk mode stays inside the room and keeps you clear of the desk. Drag to turn; touch the pad to move. No account connections or live agents run inside this room.</p>`};
 lastFocus=document.activeElement;$('#detail-content').innerHTML=content[kind]||content.help;dialog.showModal();$('#close-details').focus(); keys.clear();
}
function closeDetails(){dialog.close();lastFocus?.focus();}
$('#close-details').onclick=closeDetails;dialog.addEventListener('close',()=>{keys.clear();if(!computerSession.active)lastFocus?.focus()});dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDetails()}});
document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>details(b.dataset.open));$('#help').onclick=()=>details('help');
function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer?.capabilities.getMaxAnisotropy()||4;return t;}
function woodTexture(){return canvasTexture(1024,512,(ctx,w,h)=>{ctx.fillStyle='#885333';ctx.fillRect(0,0,w,h);for(let i=0;i<2400;i++){const y=Math.random()*h;const tone=30+Math.random()*85;ctx.strokeStyle=`rgba(${tone+85},${tone+35},${tone},${Math.random()*.19})`;ctx.lineWidth=.2+Math.random()*2.6;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(w*.3,y+Math.sin(y)*8,w*.7,y-6,w,y+Math.cos(y)*6);ctx.stroke()}for(let i=1;i<5;i++){ctx.fillStyle='#38251b66';ctx.fillRect(0,i*h/5, w,2)}for(let i=0;i<60;i++){ctx.strokeStyle='#d6a26c22';ctx.beginPath();let x=Math.random()*w,y=Math.random()*h;ctx.moveTo(x,y);ctx.lineTo(x+Math.random()*120,y-1);ctx.stroke()}});}
function planTexture(){return canvasTexture(1400,900,(g,w,h)=>{g.fillStyle='#262c2b';g.fillRect(0,0,w,h);g.strokeStyle='#d6cfac18';g.lineWidth=1;for(let x=30;x<w;x+=35){g.beginPath();g.moveTo(x,30);g.lineTo(x,h-30);g.stroke()}for(let y=30;y<h;y+=35){g.beginPath();g.moveTo(30,y);g.lineTo(w-30,y);g.stroke()}g.strokeStyle='#e8dcc1';g.lineWidth=3;g.strokeRect(45,45,w-90,h-90);g.font='22px monospace';g.fillStyle='#e8dcc1';g.fillText('COMMON GROUND / LIBRARY + GARDEN',78,91);g.font='13px monospace';g.fillText('CONCEPT STUDY 01     /     WORK IN PROGRESS',78,120);g.strokeRect(100,175,540,535);g.strokeRect(110,185,520,515);g.strokeRect(125,210,205,205);g.strokeRect(350,210,260,205);g.strokeRect(125,440,130,235);g.strokeRect(530,440,80,235);g.fillText('READING ROOM',157,310);g.fillText('COMMUNITY KITCHEN',385,310);g.save();g.translate(192,610);g.rotate(-Math.PI/2);g.fillText('SEED LIBRARY',0,0);g.restore();g.beginPath();g.arc(396,555,94,0,Math.PI*2);g.stroke();g.fillText('ASSEMBLY',365,560);for(let a=0;a<Math.PI*2;a+=Math.PI/6){g.strokeRect(389+Math.cos(a)*68,549+Math.sin(a)*68,14,14)}for(let i=0;i<4;i++){g.strokeRect(730+i*130,210,90,160);g.strokeRect(730+i*130,430,90,160);for(let j=0;j<6;j++){g.strokeStyle='#bd6250';g.beginPath();g.moveTo(740+i*130,226+j*24);g.lineTo(810+i*130,226+j*24);g.stroke()}g.strokeStyle='#e8dcc1'}g.fillText('SHARED GROWING BEDS',838,641);g.beginPath();g.arc(1190,718,52,0,Math.PI*2);g.stroke();g.fillText('WATER',1170,724);g.strokeStyle='#b95545';g.lineWidth=2;g.setLineDash([8,6]);g.strokeRect(685,175,590,500);g.setLineDash([]);g.fillStyle='#d67a60';g.fillText('NEXT: TEST A SMALL PLOT',765,167);g.strokeStyle='#e8dcc1';g.lineWidth=1;g.beginPath();g.moveTo(100,745);g.lineTo(640,745);g.moveTo(100,735);g.lineTo(100,755);g.moveTo(640,735);g.lineTo(640,755);g.stroke();g.fillStyle='#e8dcc1';g.fillText('LEARN → BUILD → OBSERVE → REVISE',100,800);g.fillText('N',1310,734);g.beginPath();g.moveTo(1315,747);g.lineTo(1315,787);g.moveTo(1306,760);g.lineTo(1315,747);g.lineTo(1324,760);g.stroke();g.font='12px monospace';g.fillText('ILLUSTRATIVE ONLY / NOT FOR CONSTRUCTION',860,815);});}
function createSceneControls(element,previous){
 const controls=new OrbitControls(camera,element);
 const configuration={enabled:true,enableDamping:true,dampingFactor:.075,minDistance:1.2,maxDistance:16,maxPolarAngle:Math.PI*.485,minPolarAngle:.13,zoomSpeed:.8,panSpeed:.65};
 for(const name of Object.keys(configuration))controls[name]=previous?previous[name]:configuration[name];
 controls.target.copy(previous?previous.target:new THREE.Vector3(...views.room.target));
 controls.addEventListener('start',()=>{targetView=null});
 return controls;
}
function setup(){
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;world.appendChild(renderer.domElement);renderGate.watch(renderer.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color('#252c29');scene.fog=new THREE.Fog('#252c29',19,35);camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.08,70);camera.position.fromArray(views.room.pos);controls=createSceneControls(renderer.domElement);controls.update();
 raycaster=new THREE.Raycaster();room=new THREE.Group();scene.add(room);
 const wood=new THREE.MeshStandardMaterial({map:woodTexture(),roughness:.86,color:'#bd956b'}),darkWood=new THREE.MeshStandardMaterial({map:woodTexture(),color:'#70513c',roughness:.88}),metal=new THREE.MeshStandardMaterial({color:'#29332c',metalness:.6,roughness:.34}),brass=new THREE.MeshStandardMaterial({color:'#b08e52',metalness:.7,roughness:.3}),paper=new THREE.MeshStandardMaterial({color:'#d8cfb0',roughness:1}),wallmat=new THREE.MeshStandardMaterial({color:'#b9ad91',roughness:1,side:THREE.FrontSide});
 function box(w,h,d,x,y,z,mat=wood,parent=room){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function cylinder(r1,r2,h,x,y,z,mat,parent=room){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,32),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function rod(a,b,r,mat,parent=room){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,va.distanceTo(vb),14),mat);m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());m.castShadow=true;parent.add(m);return m}
 function plane(w,h,x,y,z,mat,rotY=0){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.y=rotY;m.receiveShadow=true;room.add(m);return m}
 function tag(m,kind){m.userData.kind=kind;interactables.push(m);return m}
 box(9,.18,7,0,-.12,0,darkWood);box(9,.04,7,0,-.01,0,wood);plane(9,3.6,0,1.8,-3.5,wallmat);plane(7,1.05,-4.5,.525,0,wallmat,Math.PI/2);plane(7,.55,-4.5,3.325,0,wallmat,Math.PI/2);plane(1.5,2,-4.5,2.05,-2.75,wallmat,Math.PI/2);plane(2.8,2,-4.5,2.05,2.1,wallmat,Math.PI/2);
 box(9,.12,.09,0,.07,-3.43,darkWood);box(.09,.12,7,-4.43,.07,0,darkWood);
 // Window and its light, with an open cutaway wall.
 const sky=canvasTexture(256,512,(g,w,h)=>{const grd=g.createLinearGradient(0,0,0,h);grd.addColorStop(0,'#b8b894');grd.addColorStop(.5,'#f4d59e');grd.addColorStop(1,'#b8905a');g.fillStyle=grd;g.fillRect(0,0,w,h)});
 plane(2.7,2,-4.54,2.05,-.65,new THREE.MeshBasicMaterial({map:sky}),Math.PI/2);
 for(const z of [-2,.7])box(.18,2.12,.10,-4.39,2.05,z,darkWood);for(const y of [1.02,2.05,3.08])box(.18,.08,2.8,-4.39,y,-.65,darkWood);box(.17,2.1,.065,-4.36,2.05,-.65,darkWood);box(.5,.10,3,-4.30,1.0,-.65,wood);
 const ambient=new THREE.HemisphereLight('#f5dfaf','#65533d',2.2);scene.add(ambient);const sun=new THREE.DirectionalLight('#ffdab0',4.5);sun.position.set(-6,6,1.5);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.5,far:20});sun.shadow.bias=-.001;sun.shadow.normalBias=.025;scene.add(sun);scene.add(new THREE.DirectionalLight('#c3d8dd',.65));
 // Rug, a restrained woven field beneath the desk.
 const rugtex=canvasTexture(512,512,(g,w,h)=>{g.fillStyle='#6e3a2d';g.fillRect(0,0,w,h);g.strokeStyle='#b68d64';for(let i=15;i<=45;i+=10){g.lineWidth=2;g.strokeRect(i,i,w-2*i,h-2*i)}g.strokeStyle='#b6926838';for(let y=0;y<h;y+=4){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}g.fillStyle='#b59362';for(let x=65;x<470;x+=38){g.fillRect(x,25,9,9);g.fillRect(x,478,9,9)}});const rug=box(4.7,.018,3.35,.15,.024,.45,new THREE.MeshStandardMaterial({map:rugtex,roughness:1}));
 // Desk and three discreet drawers.
 box(3.7,.15,1.9,0,1.3,0);box(3.35,.25,.12,0,1.08,.82,darkWood);for(const x of [-1.57,1.57])for(const z of [-.68,.68])box(.13,1.22,.13,x,.62,z,darkWood);for(const x of [-1.15,0,1.15]){box(1.04,.2,.07,x,1.095,.90,darkWood);rod([x-.11,1.105,.96],[x+.11,1.105,.96],.018,brass)}
 // Blueprint is an actual plan texture on the table.
 const plan=planTexture();blueprintCanvas=plan.image;const bp=new THREE.Mesh(new THREE.PlaneGeometry(2.52,1.51),new THREE.MeshStandardMaterial({map:plan,roughness:1,side:THREE.DoubleSide}));bp.rotation.x=-Math.PI/2;bp.rotation.z=-.035;bp.position.set(.28,1.382,.05);room.add(bp);tag(bp,'blueprint');
 box(.045,.028,1.3,1.68,1.40,.1,new THREE.MeshStandardMaterial({color:'#c8a567'}));const pencil=rod([1.50,1.406,.55],[1.58,1.406,-.14],.016,new THREE.MeshStandardMaterial({color:'#9d382b'}));
 // An original monitor case; no portfolio models are copied.
 const caseMat=new THREE.MeshStandardMaterial({color:'#c6bea8',roughness:.72});
 tag(box(1.72,1.42,.31,.62,2.08,-.84,caseMat),'computer');
 box(.24,.27,.22,.62,1.51,-.83,caseMat);box(.74,.06,.46,.62,1.405,-.80,caseMat);
 const screenTexture=canvasTexture(1000,766,(g,w,h)=>{g.fillStyle='#182b29';g.fillRect(0,0,w,h);g.strokeStyle='#a9b39b';g.strokeRect(34,34,w-68,h-68);g.fillStyle='#ddd7be';g.font='24px monospace';g.fillText('NOOBIAN LABS',70,96);g.font='64px Georgia';g.fillText('Abdullah Saleh',70,310);g.fillText('People > profit.',70,385);g.font='23px monospace';g.fillStyle='#e48165';g.fillText('PROJECTS / ABOUT / CONTACT',70,645)});
 screenMesh=tag(plane(screenSize.w,screenSize.h,screenCenter.x,screenCenter.y,screenCenter.z,new THREE.MeshBasicMaterial({map:screenTexture})),'computer');
 box(.74,.04,.23,.80,1.416,.05,caseMat);
 // Chair: wood frame, comfortable woven seat.
 box(.93,.12,.83,0,.65,1.67,darkWood);for(const x of [-.39,.39])for(const z of [1.35,2])box(.075,.65,.075,x,.31,z,darkWood);for(const x of [-.41,.41])box(.09,.9,.09,x,1.02,2.02,darkWood);box(.88,.13,.1,0,1.48,2.02,darkWood);for(const x of [-.26,0,.26])box(.035,.55,.05,x,1.16,2.02,darkWood);box(.78,.035,.69,0,.728,1.65,new THREE.MeshStandardMaterial({color:'#8a7b54',roughness:1}));
 // Reading shelves, a few volumes, and one notebook on the desk.
 box(1.75,2.7,.10,-2.8,1.35,-3.35,darkWood);for(const x of [-3.7,-1.9])box(.11,2.8,.44,x,1.4,-3.15,darkWood);for(const y of [.13,.83,1.53,2.23,2.78])box(1.9,.1,.48,-2.8,y,-3.12,darkWood);
 const bookColors=['#31483e','#805342','#343a3a','#a4936a','#6c2926'];for(let row=0;row<3;row++){for(let n=0;n<7;n++){const bw=.12+(n%3)*.035,h=.36+(n%4)*.058,x=-3.52+n*.20;const b=box(bw,h,.30,x,.20+row*.7+h/2,-3.05,new THREE.MeshStandardMaterial({color:bookColors[(n+row)%5],roughness:.9}));tag(b,'books');box(bw*.8,.017,.008,x,.20+row*.7+h*.77,-2.895,brass)}}
 for(let i=0;i<3;i++){const y=1.42+i*.084;const b=box(.55,.073,.41,-1.13,y,-.43,new THREE.MeshStandardMaterial({color:bookColors[i+1]}));tag(b,'books');box(.52,.044,.37,-1.13,y,-.422,paper)}tag(box(.43,.04,.60,-1.18,1.40,.35,metal),'books');
 // Articulated green lamp with a real local light.
 const lampGroup=new THREE.Group();room.add(lampGroup);tag(cylinder(.17,.21,.045,-1.39,1.407,-.61,metal,lampGroup),'lamp');rod([-1.39,1.43,-.61],[-1.45,1.98,-.65],.025,brass,lampGroup);rod([-1.45,1.98,-.65],[-1.06,2.28,-.48],.024,brass,lampGroup);for(const a of [[-1.45,1.98,-.65],[-1.06,2.28,-.48]]){const joint=new THREE.Mesh(new THREE.SphereGeometry(.05,16,8),brass);joint.position.fromArray(a);lampGroup.add(joint)}const shade=tag(cylinder(.07,.25,.23,-1.02,2.21,-.45,metal,lampGroup),'lamp');const bulbMat=new THREE.MeshBasicMaterial({color:'#ffdda0'});const bulb=cylinder(.215,.215,.005,-1.02,2.092,-.45,bulbMat,lampGroup);const lampLight=new THREE.PointLight('#ffc477',3,3,1.5);lampLight.position.set(-1.02,2.035,-.45);scene.add(lampLight);window.studioLamp={lampLight,bulbMat};lampGroup.children.forEach(m=>tag(m,'lamp'));
 // One plant at the window.
 const terracotta=new THREE.MeshStandardMaterial({color:'#88513a',roughness:1});cylinder(.21,.155,.31,-4.21,1.22,-1.25,terracotta);cylinder(.185,.185,.012,-4.21,1.38,-1.25,new THREE.MeshStandardMaterial({color:'#302c21'}));for(let i=0;i<8;i++){const a=i*2.4,tip=[-4.21+Math.sin(a)*.34,1.7+(i%3)*.12,-1.25+Math.cos(a)*.26];rod([-4.21,1.36,-1.25],tip,.012,new THREE.MeshStandardMaterial({color:'#415333'}));const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshStandardMaterial({color:i%2?'#4f653e':'#344b32',roughness:.9}));leaf.scale.set(.10,.22,.03);leaf.position.fromArray(tip);leaf.rotation.set(.2,a,-.5+Math.sin(a));room.add(leaf)}
 // The collection chooses and decodes the first eligible poster; setup stays neutral.
 const posterTex=canvasTexture(1,1,(g,w,h)=>{g.fillStyle='#1f2520';g.fillRect(0,0,w,h)});box(1.45,2.08,.08,1.25,2.04,-3.395,darkWood);posterMesh=tag(plane(1.32,1.9,1.25,2.04,-3.342,new THREE.MeshStandardMaterial({map:posterTex,roughness:.96})),'poster');
 // Small neutral label beneath the frame, also named by the keyboard control.
 $('[data-open="poster"]').setAttribute('aria-label','Poster collection');
 const labelTex=canvasTexture(512,64,(g,w,h)=>{g.fillStyle='#c7b997';g.fillRect(0,0,w,h);g.fillStyle='#363b2e';g.font='22px monospace';g.fillText('MY POSTER COLLECTION',28,41)});posterLabelMesh=plane(1.32,.165,1.25,.875,-3.339,new THREE.MeshStandardMaterial({map:labelTex,roughness:1}));
 addHotspot('computer','04 Portfolio',[.62,2.87,-.64]);addHotspot('blueprint','01 Blueprint',[.35,1.46,.25]);addHotspot('poster','02 Poster',[1.25,3.15,-3.28]);addHotspot('books','03 Study notes',[-2.85,2.98,-2.98]);
 if(innerWidth<600){camera.position.set(8.4,6.9,11.8);camera.lookAt(controls.target)}
 ready=true;document.dispatchEvent(new Event('studio:startup-settled'));$('#loading').style.opacity='0';setTimeout(()=>$('#loading').hidden=true,500);bindScene();animate();
}
function addHotspot(kind,title,p){const b=document.createElement('button');b.className='hotspot';b.textContent=title;b.tabIndex=-1;b.onclick=()=>details(kind);$('#labels').append(b);hotspots.push({el:b,pos:new THREE.Vector3(...p)});}
function setView(name){if(!ready||computerSession.active)return;setWalking(false);const v=views[name];const pos=[...v.pos];if(name==='room'&&innerWidth<600){pos[0]=8.4;pos[1]=6.9;pos[2]=11.8}targetView={pos:new THREE.Vector3(...pos),target:new THREE.Vector3(...v.target)};if(reduced.matches){camera.position.copy(targetView.pos);controls.target.copy(targetView.target);targetView=null}document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===name;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});$('#status').textContent=name+' view';}
function setWalking(value){if(!ready||computerSession.active)return;walking=value;targetView=null;keys.clear();controls.enabled=!walking;document.body.classList.toggle('walking',walking);$('#walk').setAttribute('aria-pressed',String(walking));$('#walk-pad').hidden=!walking;if(walking){camera.position.set(2.75,1.68,2.7);yaw=.55;pitch=-.07;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false')})}else{controls.target.set(0,1.25,-.5)}$('#control-hint').textContent=walking?'Drag to turn · WASD or arrow keys to walk':('ontouchstart' in window?'One finger to orbit · pinch to zoom':'Drag to look around · scroll to move closer');}
function toggleLight(){renderGate.invalidate();lightOn=!lightOn;if(window.studioLamp){window.studioLamp.lampLight.intensity=lightOn?3:0;window.studioLamp.bulbMat.color.set(lightOn?'#ffdda0':'#5e614e')}$('#lamp').setAttribute('aria-pressed',String(lightOn));$('#light-state').textContent=lightOn?'on':'off';$('#status').textContent='Desk light '+(lightOn?'on':'off');}
$('#lamp').onclick=toggleLight;$('#walk').onclick=()=>setWalking(!walking);$('#reset').onclick=()=>setView('room');document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
function zoom(factor){if(!ready||walking||computerSession.active)return;targetView=null;const d=camera.position.clone().sub(controls.target);const desired=THREE.MathUtils.clamp(d.length()*factor,controls.minDistance,controls.maxDistance);camera.position.copy(controls.target).add(d.setLength(desired));controls.update()}
$('#zoom-in').onclick=()=>zoom(.8);$('#zoom-out').onclick=()=>zoom(1.25);
function bindScene(){
 let pointerId=null,initial=null,previous=null,moved=false,multitouch=false;
 const active=new Set();
 const interruptGesture=()=>{
  if(!active.size)return;
  const pointers=[...active],previousControls=controls,element=controls.domElement;
  // Clear local state first: releasing capture may itself report capture loss.
  active.clear();pointerId=null;initial=null;previous=null;moved=false;multitouch=false;
  world.style.cursor=walking?'grab':'default';
  const position=camera.position.clone(),quaternion=camera.quaternion.clone();
  // A fresh public controller clears vendor gesture state and residual damping.
  // disconnect/connect alone retains its pointer list; reset would move the view.
  previousControls.dispose();
  for(const id of pointers)for(const owner of [world,element])if(owner.hasPointerCapture(id))owner.releasePointerCapture(id);
  controls=createSceneControls(element,previousControls);
  camera.position.copy(position);camera.quaternion.copy(quaternion);
 };
 window.addEventListener('blur',interruptGesture);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)interruptGesture()});
 world.addEventListener('lostpointercapture',e=>{if(active.has(e.pointerId))interruptGesture()});
 world.addEventListener('pointerdown',e=>{
  if(computerSession.active)return;
  active.add(e.pointerId);
  if(active.size>1){multitouch=true;moved=true;return;}
  const returning=targetView?.computerReturn?{view:targetView,pos:camera.position.clone(),target:controls.target.clone()}:null;
  pointerId=e.pointerId;initial={x:e.clientX,y:e.clientY,returning};previous={...initial};moved=false;multitouch=false;
  if(walking)world.setPointerCapture(e.pointerId);
 },true);
 world.addEventListener('pointermove',e=>{
  if(computerSession.active)return;
  if(initial&&e.pointerId===pointerId){
   if(Math.hypot(e.clientX-initial.x,e.clientY-initial.y)>5)moved=true;
   if(walking&&active.size===1){const dx=e.clientX-previous.x,dy=e.clientY-previous.y;yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.004,-1.2,1.1);}
   previous={x:e.clientX,y:e.clientY};
  }else if(active.size===0){const kind=hit(e);world.style.cursor=kind?'pointer':(walking?'grab':'default');}
 });
 const finish=(e,cancelled)=>{
  if(e.pointerId===pointerId){
   if(!cancelled&&initial&&!moved&&!multitouch){const kind=hit(e),returning=initial.returning;
    // OrbitControls starts even for a motionless tap. Keep its cancellation
    // for navigation, but recover a monitor return captured before that start.
    if(kind==='computer'&&returning&&!targetView&&!walking&&camera.position.distanceTo(returning.pos)<1e-8&&controls.target.distanceTo(returning.target)<1e-8)targetView=returning.view;
    if(kind==='lamp')toggleLight();else if(kind)details(kind);
   }
   pointerId=null;initial=null;previous=null;
  }
  active.delete(e.pointerId);
  if(active.size===0)multitouch=false;
 };
 world.addEventListener('pointerup',e=>finish(e,false));
 world.addEventListener('pointercancel',e=>finish(e,true));
 world.addEventListener('contextmenu',e=>e.preventDefault());
}
function hit(e){raycaster.setFromCamera(new THREE.Vector2(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1),camera);return raycaster.intersectObjects(interactables,false)[0]?.object.userData.kind;}
const movement={forward:['KeyW','ArrowUp'],backward:['KeyS','ArrowDown'],left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight']};
addEventListener('keydown',e=>{if(computerSession.active){if(e.code==='Escape'){e.preventDefault();leaveComputer()}return;}if(dialog.open||e.altKey||e.ctrlKey||e.metaKey)return;if(e.code==='KeyR')setView('room');if(walking&&Object.values(movement).flat().includes(e.code)){e.preventDefault();keys.add(e.code)}});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());
document.querySelectorAll('[data-move]').forEach(b=>{const key=movement[b.dataset.move][0];b.addEventListener('pointerdown',e=>{if(!walking||dialog.open||computerSession.active)return;e.preventDefault();keys.add(key);b.setPointerCapture(e.pointerId)});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>keys.delete(key)));b.addEventListener('click',e=>{if(e.detail===0)stepWalk(b.dataset.move)})});
function stepWalk(direction){
 if(!walking||dialog.open||computerSession.active)return;
 const forward=direction==='forward'?1:direction==='backward'?-1:0,side=direction==='right'?1:direction==='left'?-1:0;
 const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*.22,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*.22;
 if(canMove(camera.position.x+dx,camera.position.z))camera.position.x+=dx;
 if(canMove(camera.position.x,camera.position.z+dz))camera.position.z+=dz;
}
function canMove(x,z){return x>-4.05&&x<4.05&&z>-2.6&&z<3.15&&!(Math.abs(x)<2.06&&z> -1.19&&z<1.13)&&!(Math.abs(x)<.65&&z>1.12&&z<2.3)}
function animate(){if(!ready)return;requestAnimationFrame(animate);const now=performance.now(),dt=Math.min((now-lastTime)/1000,.05);lastTime=now;if(document.hidden)return;if(walking){camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);const length=Math.hypot(forward,side)||1;forward/=length;side/=length;const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*dt*1.8,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*dt*1.8;if(canMove(camera.position.x+dx,camera.position.z))camera.position.x+=dx;if(canMove(camera.position.x,camera.position.z+dz))camera.position.z+=dz;}else{if(targetView){const amount=reduced.matches?1:.075;camera.position.lerp(targetView.pos,amount);controls.target.lerp(targetView.target,amount);if(camera.position.distanceTo(targetView.pos)<.01&&controls.target.distanceTo(targetView.target)<.01)targetView=null;}if(computerSession.active)camera.lookAt(controls.target);else controls.update();camera.position.y=Math.max(.3,camera.position.y)}
 if(!renderGate.shouldRender(camera,innerWidth,innerHeight))return;
 camera.updateMatrixWorld();
 for(const h of hotspots){const p=h.pos.clone().project(camera);const visible=p.z<1&&p.z>-1&&Math.abs(p.x)<.92&&Math.abs(p.y)<.78;h.el.hidden=!visible;h.el.style.left=(p.x*.5+.5)*innerWidth+'px';h.el.style.top=(-p.y*.5+.5)*innerHeight+'px'}renderer.render(scene,camera);updateComputerScreen();}
addEventListener('resize',()=>{renderGate.invalidate();if(ready){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}if(computerSession.active){focusComputer();updateComputerScreen()}});
function fallback(error){ready=false;console.warn('WebGL room unavailable',error);document.dispatchEvent(new Event('studio:startup-settled'));$('#loading').hidden=true;$('#fallback').hidden=false;document.body.classList.add('no-webgl');}
function focusComputer(){
 renderGate.invalidate();
 if(!ready)return;
 const top=$('#computer-controls').getBoundingClientRect().bottom+18,bottom=24;
 const availableH=Math.max(80,innerHeight-top-bottom),availableW=Math.max(240,innerWidth-60);
 const distance=Math.max(screenSize.h/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*(innerHeight/availableH),screenSize.w/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)*(innerWidth/availableW));
 const aim=screenCenter.clone();aim.y+=(top-bottom)*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/innerHeight;
 targetView={pos:aim.clone().add(new THREE.Vector3(0,0,distance)),target:aim};
 if(reduced.matches){camera.position.copy(targetView.pos);controls.target.copy(targetView.target);targetView=null;camera.lookAt(controls.target)}
}
function enterComputer(fromHistory=false){
 if(computerSession.active||dialog.open||historyReturning)return;
 // Reopening mid-return keeps that destination; deliberate room navigation
 // replaces or clears targetView and still saves the new entry pose.
 const returning=targetView?.computerReturn;
 const snapshot={focus:document.activeElement,walking,yaw,pitch,hint:$('#control-hint').textContent,pos:returning?targetView.pos.clone():camera?.position.clone(),target:returning?targetView.target.clone():controls?.target.clone()};
 if(ready)setWalking(false);
 computerSession.enter(snapshot);keys.clear();if(controls)controls.enabled=false;
 expanded=innerWidth<700||!ready;
 document.body.classList.add('using-computer');$('#computer-controls').hidden=false;
 for(const el of document.querySelectorAll('header,.views,.object-nav,.camera-tools,#world,#labels,.skip,#fallback'))el.inert=true;
 $('#computer-back').focus();focusComputer();
 if(!fromHistory){const writeHistory=history.state?.studioComputerSlot?'replaceState':'pushState';history[writeHistory]({...history.state,studioComputer:true,studioComputerSlot:true},'',location.pathname+location.search+'#computer');historyOwned=true}
 portfolioLoad.open();
 updateComputerScreen();$('#status').textContent='Computer open. Use Back to room to return.';
}
function leaveComputer(fromHistory=false){
 const snapshot=computerSession.exit();if(!snapshot)return;portfolioLoad.close();
 $('#computer-screen').hidden=true;$('#computer-controls').hidden=true;document.body.classList.remove('using-computer');keys.clear();
 for(const el of document.querySelectorAll('header,.views,.object-nav,.camera-tools,#world,#labels,.skip,#fallback'))el.inert=false;
 if(ready){walking=snapshot.walking;yaw=snapshot.yaw;pitch=snapshot.pitch;controls.enabled=!walking;document.body.classList.toggle('walking',walking);$('#walk').setAttribute('aria-pressed',String(walking));$('#walk-pad').hidden=!walking;
 if(walking){camera.position.copy(snapshot.pos);targetView=null;}else{targetView={pos:snapshot.pos,target:snapshot.target,computerReturn:true};if(reduced.matches){camera.position.copy(snapshot.pos);controls.target.copy(snapshot.target);targetView=null;controls.update()}}}
 $('#control-hint').textContent=snapshot.hint;snapshot.focus?.focus();$('#status').textContent='Returned to room';
 // Do not traverse joint browser/iframe history to close the room computer.
 if(!fromHistory&&location.hash==='#computer'){historyOwned=false;history.replaceState({...history.state,studioComputer:false},'',location.pathname+location.search)}
}
function updateComputerScreen(){
 if(!computerSession.active)return;
 const el=$('#computer-screen'),flat=expanded||!ready||innerWidth<700;
 el.classList.toggle('expanded',flat);$('#computer-expand').setAttribute('aria-pressed',String(flat));$('#computer-expand').textContent=flat?'In-room screen':'Expand screen';
 if(flat){el.hidden=false;el.style.transform='';el.style.top=($('#computer-controls').getBoundingClientRect().bottom+12)+'px';return;}
 el.style.top='0px';
 if(targetView){el.hidden=true;return;}
 camera.updateMatrixWorld();screenMesh.updateMatrixWorld();
 const matrix=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(screenMesh.matrixWorld);
 el.style.transform='matrix3d('+projectScreen(matrix.elements,1280,980,screenSize.w,screenSize.h,innerWidth,innerHeight).join(',')+')';el.hidden=false;
}
const portfolioLoad=createPortfolioLoadController({frame:$('#desktop-frame'),portfolioURL:new URL('/portfolio?embedded=1',location.href).href,onState(state){
 const opened=state.phase==='ready';
 $('#computer-loading').hidden=opened;
 $('#desktop-frame').inert=!opened;
 $('#desktop-frame').setAttribute('aria-busy',String(state.isOpen&&['loading','slow'].includes(state.phase)));
 const title=state.phase==='slow'?'This is taking longer than expected.':state.phase==='cannot-open'?'Couldn’t restart this view.':state.phase==='unconfirmed'?'This view isn’t confirmed as your portfolio.':'Opening your portfolio…';
 $('#computer-loading-title').textContent=title;
 $('#computer-loading-help').textContent='You can retry this view or open the reading portfolio separately.';
 if(state.isOpen&&opened)$('#status').textContent='Portfolio document opened.';
}});
addEventListener('message',e=>{
 portfolioLoad.handleMessage(e);
 const state=portfolioLoad.getState();
 if(!computerSession.active||!state.isOpen||!state.attemptURL)return;
 if(e.origin===location.origin&&e.source===$('#desktop-frame').contentWindow&&e.data?.type==='studio:close-computer'&&e.data.attempt===new URL(state.attemptURL).searchParams.get('_studioAttempt'))leaveComputer();
});
$('#computer-back').onclick=()=>leaveComputer();$('#computer-expand').onclick=()=>{expanded=!expanded;updateComputerScreen()};
$('#computer-retry').onclick=()=>portfolioLoad.retry();
$('#desktop-frame').addEventListener('load',portfolioLoad.handleLoad);
addEventListener('popstate',()=>{historyReturning=false;if(location.hash==='#computer'){historyOwned=Boolean(history.state?.studioComputer);if(dialog.open)closeDetails();enterComputer(true)}else{historyOwned=false;leaveComputer(true)}});
try{setup()}catch(e){fallback(e)}
posterUI=mountPosterUI({dialog,content:$('#detail-content'),opened(){lastFocus=document.activeElement;keys.clear()},changed(p,img){
 renderGate.invalidate();
 $('[data-open="poster"]').setAttribute('aria-label',p?'Poster: '+p.title:'Poster collection. No posters selected.');
 if(!posterMesh)return;
 const texture=canvasTexture(800,1152,(g,w,h)=>{g.fillStyle='#1f2520';g.fillRect(0,0,w,h);if(img){const scale=Math.min(w/img.width,h/img.height),dw=img.width*scale,dh=img.height*scale;g.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh)}});
 const old=posterMesh.material.map;posterMesh.material.map=texture;posterMesh.material.needsUpdate=true;old?.dispose();
 const label=canvasTexture(1024,128,(g,w,h)=>{g.fillStyle='#c7b997';g.fillRect(0,0,w,h);g.fillStyle='#363b2e';g.font='28px monospace';g.fillText((p?.title||'MY COLLECTION').slice(0,48),24,50);g.font='22px monospace';g.fillText((p?.credit||'Add a poster to begin').slice(0,64),24,90)});
 const oldLabel=posterLabelMesh.material.map;posterLabelMesh.material.map=label;oldLabel?.dispose();
}});
if(location.hash==='#computer'){historyOwned=Boolean(history.state?.studioComputer);enterComputer(true);}
