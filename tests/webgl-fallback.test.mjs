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
  assert.match(html(), /WebGL is required to run the interactive scene\./);
  assert.doesNotMatch(html(), /WebGL is required to run this site/);
});
test('no-WebGL overlay allows vertical overflow rather than clipping the escape', () => {
  const element = DisplayWebGLError();
  assert.equal(element.props.style?.overflowY, 'auto');
});
test('no-WebGL fallback preserves identity, enable-browser help and CV destination', () => {
  const markup = html();
  assert.match(markup, /Abdullah Saleh/);
  assert.match(markup, /ERROR: No WebGL detected/);
  assert.match(markup, /Please enable it or switch to a browser that supports WebGL/);
  assert.match(markup, /href="\/assets\/cv\/Abdullah_Saleh_resume\.pdf" target="_blank"/);
});
test('actual detection returns false when standard and experimental contexts are absent', () => {
  const requests = [];
  const { detectWebGL } = declarations('../apps/web/components/scene-loader/util.ts', ['detectWebGL'], { document: { createElement(tag) { assert.equal(tag, 'canvas'); return { getContext(kind) { requests.push(kind); return null; } }; } } });
  assert.equal(detectWebGL(), false);
  assert.deepEqual(requests, ['webgl', 'experimental-webgl']);
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
