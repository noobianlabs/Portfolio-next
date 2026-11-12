import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function evaluate(code, globals) {
  const output = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  runInNewContext(output, { module, exports: module.exports, AbortController, ...globals });
  return module.exports;
}
function astFile(relative) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  return ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}
const sceneAST = astFile('../apps/web/components/scene-loader/SceneLoader.tsx');
const scene = sceneAST.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'SceneLoader');
const firstEffect = scene.body.statements.find(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) && n.expression.expression.getText(sceneAST) === 'useEffect').expression.arguments[0].getText(sceneAST);
const managerAST = astFile('../apps/web/components/scene-loader/AssetManager.ts');
const managerClasses = managerAST.statements.filter(n => ts.isClassDeclaration(n) && ['AssetManager', 'AssetManagerContext'].includes(n.name?.text)).map(n => n.getText(managerAST)).join('\n');
function fixture({ failAt, realInit = false } = {}) {
  const events = [], updates = [], failures = [], loading = [], supports = [], controllers = [];
  let resolve, reject, progressCallback, signal;
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const progress = { label: 'progress' };
  const step = name => { events.push(name); if (failAt === name) throw Error('controlled ' + name); };
  class ControlledManager {
    constructor() { step('constructor'); }
    init() { step('init'); }
    reset() { step('reset'); }
    add(name) { step('add:' + name); }
    loadingProgress() { step('progress'); return progress; }
    load(received, callback) { step('load'); signal = received; progressCallback = callback; return pending; }
  }
  let Manager = ControlledManager;
  if (realInit) {
    Manager = evaluate(managerClasses + '\nmodule.exports = AssetManager;', {
      TextureLoader: class { constructor() { events.push('texture'); throw Error('controlled texture loader failure'); } },
      GLTFLoader: class { constructor() { events.push('gltf'); } },
      WebGLRenderer: class { constructor() { events.push('renderer'); } },
    });
  }
  const managerRef = { current: null }, actions = { current: [] };
  const globals = { AbortController: class extends AbortController { constructor() { super(); controllers.push(this); } }, detectWebGL: () => true, setSupportsWebGL: value => supports.push(value), managerRef, scenes: {}, actions,
    AssetManager: Manager, LoadingManager: class {}, isDebug: () => false,
    setLoadingProgress: value => updates.push(value), setLoadFailed: value => failures.push(value), setLoading: value => loading.push(value),
  };
  for (const name of ['NoopLoader','DeskLoader','CablesLoader','MouseLoader','LightsLoader','FloorLoader','PlantLoader','HydraLoader','KeyboardLoader','MonitorLoader']) globals[name] = () => ({ name });
  const start = evaluate('module.exports = ' + firstEffect, globals);
  return { start, events, updates, failures, loading, supports, controllers, actions, resolve, reject, progress: () => progressCallback(), get signal() { return signal; } };
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };
test('real AssetManager init throwing at TextureLoader is recovered by the startup effect', async () => {
  const f = fixture({ realInit: true });
  let cleanup;
  assert.doesNotThrow(() => { cleanup = f.start(); });
  await settle();
  assert.deepEqual(f.events, ['texture']);
  assert.deepEqual(f.failures, [true]);
  assert.deepEqual(f.loading, []);
  assert.equal(f.controllers.length, 1); assert.equal(f.controllers[0].signal.aborted, true);
  assert.equal(typeof cleanup, 'function');
  cleanup();
});
for (const failAt of ['constructor','reset','add:Loading desk','progress']) test('startup failure is contained at ' + failAt, async () => {
  const f = fixture({ failAt }); let cleanup;
  assert.doesNotThrow(() => { cleanup = f.start(); }); await settle();
  assert.deepEqual(f.failures, [true]); assert(!f.events.includes('load')); assert.equal(f.controllers.length, 1); assert.equal(f.controllers[0].signal.aborted, true); cleanup();
});
test('successful startup preserves setup order and publishes completion actions', async () => {
  const f = fixture(); const cleanup = f.start();
  assert.deepEqual(f.events, ['constructor','init','reset','add:Linked to Magi-1','add:Linked to Magi-2','add:Linked to Magi-3','add:Loading desk','add:Loading cables','add:Loading mouse','add:Loading lights','add:Loading floor','add:Loading plant','add:Loading Alchemical Hydra','add:Loading keyboard','add:Loading monitor','progress','load']);
  const actions = [() => {}]; f.resolve({ updateActions: actions }); await settle();
  assert.equal(f.actions.current, actions); assert.deepEqual(f.loading, [false]); assert.deepEqual(f.failures, []); cleanup(); assert.equal(f.signal.aborted, true);
});
test('load rejection marks startup failed and aborts the pending signal', async () => {
  const f = fixture(); const cleanup = f.start(); f.reject(Error('controlled load failure')); await settle();
  assert.deepEqual(f.failures, [true]); assert.equal(f.signal.aborted, true); cleanup();
});
test('cleanup suppresses late progress and completion after pending load', async () => {
  const f = fixture(); const cleanup = f.start(); const before = f.updates.length; cleanup();
  f.progress(); f.resolve({ updateActions: [() => {}] }); await settle();
  assert.equal(f.updates.length, before); assert.equal(f.actions.current.length, 0); assert.deepEqual(f.loading, []); assert.deepEqual(f.failures, []);
});
test('cleanup suppresses a later load rejection', async () => {
  const f = fixture(); const cleanup = f.start(); cleanup(); f.reject(Error('late rejection')); await settle();
  assert.deepEqual(f.failures, []); assert.deepEqual(f.loading, []);
});

// Real manager classes execute; loader/GPU constructors are controlled external boundaries.
// An eager renderer allocation or incorrectly wired loader context must fail this test.
test('asset loading uses its loader context without allocating a GPU renderer', async () => {
  const events = []; let rendererCount = 0;
  const loadingManager = {}, scenes = { sourceScene: {}, cutoutScene: {}, cssScene: {} };
  let texture, gltf;
  const Manager = evaluate(managerClasses + '\nmodule.exports = AssetManager;', {
    TextureLoader: class { constructor(manager) { assert.equal(manager, loadingManager); events.push('texture'); texture = this; } },
    GLTFLoader: class { constructor(manager) { assert.equal(manager, loadingManager); events.push('gltf'); gltf = this; } },
    WebGLRenderer: class { constructor() { rendererCount++; } },
  });
  const manager = new Manager(scenes, loadingManager);
  manager.init(true);
  assert.equal(manager.getRenderScenes(), scenes);
  let downloadedContext;
  const action = () => {};
  manager.add('controlled asset', {
    downloader: async context => { events.push('download'); downloadedContext = context; assert.equal(context.debug, true); assert.equal(context.textureLoader, texture); assert.equal(context.gltfLoader, gltf); assert.equal(context.scenes, scenes); },
    builder: context => { events.push('build'); assert.equal(context, downloadedContext); return [action]; },
    builderProcessTime: 0,
  });
  const result = await manager.load();
  assert.deepEqual(events, ['texture', 'gltf', 'download', 'build']);
  assert.equal(result.updateActions.length, 1); assert.equal(result.updateActions[0], action);
  manager.setDebug(false); assert.equal(downloadedContext.debug, false);
  assert.equal(rendererCount, 0, 'asset initialization must not allocate an unused GPU renderer');
});
