import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
// Actual panel/helpers and progress model; no asset/GPU/browser execution.
function declarations(relative, names) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const ast = ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const selected = ast.statements.filter(n => (ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n)) && names.includes(n.name?.text));
  assert.equal(selected.length, names.length);
  const code = selected.map(n => n.getText(ast)).join('\n') + '\nmodule.exports = {' + names.join(',') + '};';
  const output = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  runInNewContext(output, { module, exports: module.exports, require, styles: new Proxy({}, { get: (_, key) => String(key) }) });
  return module.exports;
}
const { LoadingProgress } = declarations('../apps/web/components/scene-loader/AssetManager.ts', ['LoadingProgress']);
const { DisplayLoadingProgress } = declarations('../apps/web/components/scene-loader/SceneLoader.tsx', ['createSpacer', 'ResourceLoadingStatus', 'DisplayResource', 'OperatingSystemStats', 'ShowLoadingResources', 'ShowBios', 'DisplayLoadingFooter', 'DisplayLoadingProgress']);
const names = ['Linked to Magi-1', 'Linked to Magi-2', 'Linked to Magi-3', 'Loading desk', 'Loading cables', 'Loading mouse', 'Loading lights', 'Loading floor', 'Loading plant', 'Loading Alchemical Hydra', 'Loading keyboard', 'Loading monitor'];
const progress = () => new LoadingProgress(names.map((name, i) => ({ name, downloaded: i < 3, processed: i < 3 })));
const element = () => DisplayLoadingProgress({ loadingProgress: progress() });
const html = () => renderToStaticMarkup(React.createElement(DisplayLoadingProgress, { loadingProgress: progress() }));
test('pending panel retains all twelve resource rows in registration order', () => {
  const markup = html(), rows = [...markup.matchAll(/<li\b[^>]*>(.*?)<\/li>/g)].map(m => m[1]);
  const resources = rows.filter(row => names.some(name => row.startsWith(name)));
  assert.equal(resources.length, 12);
  names.forEach((name, i) => { assert.ok(resources[i].startsWith(name)); assert.ok(resources[i].endsWith(i < 3 ? '(2/2)' : '(0/2)')); });
  assert.match(markup, /Loading resources \(3\/12\)/);
});
test('pending panel retains identity, reading escape and trailing resume destination', () => {
  const markup = html();
  assert.match(markup, /Abdullah Saleh/);
  assert.match(markup, /<a href="\/portfolio">Read my portfolio instead<\/a>/);
  assert.match(markup, /<a href="\/assets\/cv\/Abdullah_Saleh_resume\.pdf" target="_blank">resume<\/a>/);
  assert.ok(markup.indexOf('Loading monitor') < markup.indexOf('Loading taking a while?'));
});
test('pending panel allows vertical scrolling instead of clipping its resource and resume content', () => {
  const panel = element().props.children;
  assert.equal(panel.props.className, 'loading-progress');
  assert.equal(panel.props.style?.overflowY, 'auto');
});
