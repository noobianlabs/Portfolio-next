import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const { code } = require('./renderer-controls-source.cjs');
const { renderToStaticMarkup } = require('react-dom/server');
const module = { exports: {} };
runInNewContext(code(), { module, exports: module.exports, require });
const { SoundManagementButton, ChangeSceneButton, CameraHandlerState: State } = module.exports;
for (const [enabled,label,icon] of [[true,'Mute sound','mute-icon.svg'],[false,'Unmute sound','unmute-icon.svg']]) test('sound action is named '+label+' with a decorative icon', () => {
  const element=SoundManagementButton({sound:{isSoundEnabled:enabled,toggleSound(){}}});
  assert.equal(element.props['aria-label'],label);
  assert.ok(renderToStaticMarkup(element).includes('aria-label="'+label+'"'));
  assert.equal(element.props.children.props.alt,'');
  assert.equal(element.props.children.props.src,'/icons/'+icon);
  assert.match(renderToStaticMarkup(element), /<button/);
});
for (const [target,label] of [[State.MonitorView,'View the computer'],[State.Cinematic,'View the room'],[State.FreeRoam,'Change camera view']]) test('camera action is named '+label, () => {
  const element=ChangeSceneButton({targetState:target,cameraHandler:{current:null}});
  assert.equal(element.props['aria-label'],label);
  assert.ok(renderToStaticMarkup(element).includes('aria-label="'+label+'"'));
  assert.equal(element.props.children.props.alt,'');
  assert.equal(element.props.children.props.src,'/icons/camera.svg');
});
test('actual sound button invokes the supplied toggle exactly once', () => {
  let calls=0;const button=SoundManagementButton({sound:{isSoundEnabled:true,toggleSound(){calls++;}}});
  assert.equal(calls,0);button.props.onClick();assert.equal(calls,1);
});
test('actual camera button sends the exact target and retains its null guard', () => {
  const calls=[];const handler={current:{changeState(target){calls.push(target);}}};
  const button=ChangeSceneButton({targetState:State.MonitorView,cameraHandler:handler});
  button.props.onClick();assert.deepEqual(calls,[State.MonitorView]);handler.current=null;
  assert.doesNotThrow(()=>button.props.onClick());assert.equal(calls.length,1);
});
test('control icons are explicitly decorative rather than accidental names', () => {
  const sound=SoundManagementButton({sound:{isSoundEnabled:true,toggleSound(){}}});
  const camera=ChangeSceneButton({targetState:State.Cinematic,cameraHandler:{current:null}});
  assert.equal(sound.props.children.props.alt,'');
  assert.equal(camera.props.children.props.alt,'');
});
