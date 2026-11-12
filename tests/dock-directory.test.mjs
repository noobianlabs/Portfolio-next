import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{load}=require('./dock-directory-source.cjs');
const destinations=[['Applications','/Applications/Finder.app /Applications'],['Documents','/Applications/Finder.app /Users/abdullah/Documents'],['Bin','/Applications/Finder.app /Users/abdullah/Trash'],['Resume','/Users/abdullah/Desktop/Resume.pdf']];
for(const [title,target] of destinations)test('actual Dock '+title+' exposes its destination name and retains its launch target',()=>{
 const calls=[],actual=load({open(value){calls.push(value);}}),item=actual.constructDirectoryItems().find(x=>x.title===title);
 const html=renderToStaticMarkup(React.createElement(()=>actual.DockItemDirectory(item,{})));
 assert.ok(html.includes('aria-label="'+title+'"'),html);assert.ok(html.includes('alt=""'),html);assert.ok(html.includes('data-tooltip="'+title+'"'));assert.ok(html.includes('src="'+item.icon.src+'"'));item.onClick();assert.deepEqual(calls,[target]);
});
test('file title is escaped without adding markup or changing the supplied click action',()=>{
 const actual=load({}),item={kind:'file',title:'Notes "A" & <B>',path:'/notes',icon:{src:'/icons/printer.png',alt:'File icon'},onClick(){}};
 const html=renderToStaticMarkup(React.createElement(()=>actual.DockItemDirectory(item,{})));assert.ok(html.includes('aria-label="Notes &quot;A&quot; &amp; &lt;B&gt;"'),html);assert.ok(!html.includes('<B>'));
});
function controlled(item,fileSystem){const effects=[],listeners=new Map(),removed=[],hover=[];const node={addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name,fn){assert.equal(listeners.get(name),fn);listeners.delete(name);removed.push(name);}};const actual=load({}, {useRef:()=>({current:node}),useState:()=>[false,v=>hover.push(v)],useEffect:fn=>effects.push(fn)});const element=actual.DockItemDirectory(item,fileSystem);const button=element.props.children;return {button,effects,listeners,removed,hover};}
test('rendered directory click invokes original action exactly once without file-system mutation',()=>{
 const calls=[],f=controlled({kind:'directory',title:'Documents',path:'/docs',icon:{src:'/docs.png',alt:'File icon'},onClick(){calls.push('open');}},{});assert.deepEqual(calls,[]);f.button.props.onClick();assert.deepEqual(calls,['open']);assert.equal(f.button.props['data-drop-point'],'true');assert.equal(f.button.props.className,'dock-application ');
});
test('actual drag/drop listeners retain hover, path and move behavior and detach on cleanup',()=>{
 const moved=[],paths=[],parent={},first={},second={};const f=controlled({kind:'directory',title:'Documents',path:'/docs',icon:{src:'/docs.png',alt:'File icon'},onClick(){}},{getDirectory(p){paths.push(p);return {ok:true,value:parent};},moveNode(...args){moved.push(args);}});const cleanup=f.effects[0]();f.listeners.get('fs_item_drag_enter')();f.listeners.get('fs_item_drag_leave')();f.listeners.get('fs_item_drag_drop')({detail:{nodes:[{item:first},{item:second}]}});assert.deepEqual(f.hover,[true,false,false]);assert.deepEqual(paths,['/docs']);assert.deepEqual(moved,[[first,parent],[second,parent]]);cleanup();assert.equal(f.listeners.size,0);assert.equal(f.removed.length,3);
});
