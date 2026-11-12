import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
// Real intro function; controlled small-client branch, not browser hydration or layout.
function intro(smallWindow) {
  const source = readFileSync(new URL('../apps/web/components/scene-loader/SceneLoader.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('scene.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'ShowUserMessage');
  assert.ok(declaration);
  const output = ts.transpileModule(declaration.getText(ast) + '\nmodule.exports = ShowUserMessage;', { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  runInNewContext(output, { module, exports: module.exports, require, useSmallWindow: () => smallWindow, styles: new Proxy({}, { get: (_, key) => String(key) }) });
  return module.exports;
}
const html = small => renderToStaticMarkup(React.createElement(intro(small), { onClick() {} }));
test('small-window intro preserves identity, warning, CV and Continue content', () => {
  const markup = html(true);
  assert.match(markup, /<h1>Portfolio of Abdullah Saleh<\/h1>/);
  assert.match(markup, /WARNING: This portfolio is best experienced on a desktop, laptop or a tablet computer/);
  assert.match(markup, /<a href="\/assets\/cv\/Abdullah_Saleh_resume\.pdf" target="_blank">here<\/a>/);
  assert.match(markup, /Click continue to begin/);
  assert.match(markup, /<button>Continue<\/button>/);
});
test('larger-window intro omits only the small-window warning', () => {
  assert.doesNotMatch(html(false), /WARNING:/);
  assert.match(html(false), /<button>Continue<\/button>/);
});
test('actual Continue button forwards the owner action once when activated', () => {
  let calls = 0;
  const element = intro(true)({ onClick: () => { calls++; } });
  const buttons = [];
  function visit(node) {
    if (!React.isValidElement(node)) return;
    if (node.type === 'button') buttons.push(node);
    React.Children.forEach(node.props.children, visit);
  }
  visit(element);
  assert.equal(calls, 0);
  assert.equal(buttons.length, 1);
  buttons[0].props.onClick();
  assert.equal(calls, 1);
});
