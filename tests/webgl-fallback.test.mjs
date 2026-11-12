import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
// Extract actual private declarations without loading the GPU/asset module graph.
function declarations(relative, names, globals = {}) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const ast = ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const selected = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
  assert.equal(selected.length, names.length, 'all actual declarations are present');
  const code = selected.map(node => node.getText(ast)).join('\n') + '\nmodule.exports = {' + names.join(',') + '};';
  const output = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  runInNewContext(output, { module, exports: module.exports, require, ...globals });
  return module.exports;
}
const { DisplayWebGLError } = declarations('../apps/web/components/scene-loader/SceneLoader.tsx', ['createSpacer', 'OperatingSystemStats', 'DisplayWebGLError'], { styles: new Proxy({}, { get: (_, key) => String(key) }) });
const html = () => renderToStaticMarkup(React.createElement(DisplayWebGLError));
test('no-WebGL fallback offers a normal same-tab reading link without needing scene startup', () => {
  const markup = html();
  const link = /<a\b[^>]*href="\/portfolio"[^>]*>([\s\S]*?)<\/a>/.exec(markup);
  assert.ok(link, 'a reading route escape is present');
  assert.match(link[1], /read.*portfolio/i);
  assert.doesNotMatch(link[0], /target=|onclick=|tabindex="-1"/i);
});
test('no-WebGL message limits the requirement to the interactive scene', () => {
  assert.match(html(), /WebGL 2 is required to run the interactive scene\./);
  assert.doesNotMatch(html(), /WebGL 2 is required to run this site/);
});
test('no-WebGL overlay allows vertical overflow rather than clipping the escape', () => {
  const element = DisplayWebGLError();
  assert.equal(element.props.style?.overflowY, 'auto');
});
test('no-WebGL fallback preserves identity, enable-browser help and CV destination', () => {
  const markup = html();
  assert.match(markup, /Abdullah Saleh/);
  assert.match(markup, /ERROR: No WebGL 2 detected/);
  assert.match(markup, /Please enable it or switch to a browser that supports WebGL 2/);
  assert.match(markup, /href="\/assets\/cv\/Abdullah_Saleh_resume\.pdf" target="_blank"/);
});
// Capability boundary only: no real browser/GPU is created by these tests.
class LegacyContext {}
for (const scenario of [
  { name: 'WebGL1-only', contexts: { webgl: new LegacyContext(), 'experimental-webgl': new LegacyContext() }, expected: false },
  { name: 'WebGL2 without a global context constructor', contexts: { webgl2: {} }, expected: true },
  { name: 'no available contexts', contexts: {}, expected: false },
  { name: 'context acquisition throws', contexts: {}, throws: true, expected: false },
]) test('actual detection handles ' + scenario.name + ' using only WebGL2', () => {
  const requests = [];
  const { detectWebGL } = declarations('../apps/web/components/scene-loader/util.ts', ['detectWebGL'], {
    ...(scenario.name === 'WebGL1-only' ? { WebGLRenderingContext: LegacyContext } : {}),
    document: { createElement(tag) { assert.equal(tag, 'canvas'); return { getContext(kind) { requests.push(kind); if (scenario.throws) throw Error('controlled context failure'); return scenario.contexts[kind] ?? null; } }; } },
  });
  assert.equal(detectWebGL(), scenario.expected);
  assert.deepEqual(requests, ['webgl2']);
});
test('actual detection safely handles canvas creation failure', () => {
  const { detectWebGL } = declarations('../apps/web/components/scene-loader/util.ts', ['detectWebGL'], {
    document: { createElement() { throw Error('controlled canvas creation failure'); } },
  });
  assert.equal(detectWebGL(), false);
});
test('actual SceneLoader unsupported branch returns the tested panel before Renderer', () => {
  let stateIndex = 0;
  const { SceneLoader } = declarations('../apps/web/components/scene-loader/SceneLoader.tsx', ['SceneLoader'], {
    useState(initial) { return [stateIndex++ === 6 ? false : initial, () => { throw Error('effects are not executed in this branch control'); }]; },
    useRef(current) { return { current }; }, useEffect() {}, createRenderScenes: () => ({}),
    DisplayWebGLError, Renderer() { throw Error('unsupported branch must not render the GPU renderer'); },
  });
  assert.equal(renderToStaticMarkup(SceneLoader()), html());
  assert.equal(stateIndex, 7);
});
test('actual unsupported detector result stops the startup effect before allocation', () => {
  const { detectWebGL } = declarations('../apps/web/components/scene-loader/util.ts', ['detectWebGL'], {
    document: { createElement() { return { getContext() { return null; } }; } },
  });
  const source = readFileSync(new URL('../apps/web/components/scene-loader/SceneLoader.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('scene.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const scene = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'SceneLoader');
  const effect = scene.body.statements.find(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) && n.expression.expression.getText(ast) === 'useEffect').expression.arguments[0];
  const output = ts.transpileModule('module.exports = ' + effect.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} }, supported = [], calls = [];
  class ForbiddenController { constructor() { calls.push('controller'); throw Error('unsupported startup allocated controller'); } }
  class ForbiddenManager { constructor() { calls.push('manager'); throw Error('unsupported startup allocated manager'); } }
  runInNewContext(output, { module, exports: module.exports, detectWebGL, setSupportsWebGL: value => supported.push(value), AbortController: ForbiddenController, AssetManager: ForbiddenManager });
  assert.equal(module.exports(), undefined);
  assert.deepEqual(supported, [false]);
  assert.deepEqual(calls, []);
});
