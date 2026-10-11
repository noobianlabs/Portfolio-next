import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const behaviorURL = new URL('../apps/web/components/portfolio/discovery.mjs', import.meta.url);
const behavior = existsSync(behaviorURL) ? await import(behaviorURL) : {};
const projects = [
  { id: 'habibi-tech', group: 'community' },
  { id: 'cvs-health', group: 'engineering' },
];

// Removing URI decoding or interpolating selectors would break these assertions.
test('project fragments resolve exact known ids and safely ignore malformed or unknown values', () => {
  assert.equal(typeof behavior.projectFromHash, 'function', 'the reading-page fragment resolver is implemented');
  assert.equal(behavior.projectFromHash('#cvs-health', projects), projects[1]);
  assert.equal(behavior.projectFromHash('#habibi%2Dtech', projects), projects[0]);
  for (const hash of ['', '#', '#unknown', '#%E0%A4%A', '#[id="cvs-health"]']) {
    assert.equal(behavior.projectFromHash(hash, projects), null);
  }
});

test('filters retain every project by default and select only the requested public category', () => {
  assert.equal(typeof behavior.matchesProjectFilter, 'function', 'the reading-page filter is implemented');
  assert.deepEqual(projects.filter(project => behavior.matchesProjectFilter(project, 'all')), projects);
  assert.deepEqual(projects.filter(project => behavior.matchesProjectFilter(project, 'engineering')), [projects[1]]);
  assert.deepEqual(projects.filter(project => behavior.matchesProjectFilter(project, 'community')), [projects[0]]);
});

test('embedded context requires the expected same-origin host and unique nonempty attempt token', () => {
  assert.equal(typeof behavior.embeddedContext, 'function', 'the embedded context verifier is implemented');
  const valid = {
    href: 'https://portfolio.example/portfolio?embedded=1&_studioAttempt=7',
    parentHref: 'https://portfolio.example/studio-runtime/index.html',
    isFramed: true,
  };
  assert.deepEqual(behavior.embeddedContext(valid), { origin: 'https://portfolio.example', attempt: '7' });
  for (const override of [
    { isFramed: false },
    { parentHref: 'https://untrusted.example/studio-runtime/index.html' },
    { parentHref: 'https://portfolio.example/unrelated' },
    { parentHref: null },
    { href: 'https://portfolio.example/portfolio?embedded=1' },
    { href: 'https://portfolio.example/portfolio?embedded=1&_studioAttempt=' },
    { href: 'https://portfolio.example/portfolio?embedded=1&embedded=1&_studioAttempt=7' },
    { href: 'https://portfolio.example/portfolio?embedded=1&_studioAttempt=7&_studioAttempt=8' },
    { href: 'https://portfolio.example/portfolio?embedded=0&_studioAttempt=7' },
  ]) assert.equal(behavior.embeddedContext({ ...valid, ...override }), null);
});

test('reading route exists with server-rendered content and scoped styles', () => {
  const route = new URL('../apps/web/pages/portfolio.tsx', import.meta.url);
  assert.ok(existsSync(route), 'the native Next reading route exists');
  const source = readFileSync(route, 'utf8');
  assert.match(source, /PortfolioReading/);
  assert.doesNotMatch(source, /ssr:\s*false|dangerouslySetInnerHTML/);
  assert.ok(existsSync(new URL('../apps/web/styles/Portfolio.module.css', import.meta.url)));
});

// Only styles and TS loading are adapted; the page uses real React server rendering.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
require.extensions['.css'] = (module) => {
  module.exports = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) });
};
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const result = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    });
    module._compile(result.outputText, filename);
  };
}

const componentPath = fileURLToPath(new URL('../apps/web/components/portfolio/PortfolioReading.tsx', import.meta.url));
const Component = existsSync(componentPath) ? require(componentPath).default : null;
function renderReadingPage() {
  assert.equal(typeof Component, 'function', 'a native server-rendered reading component is implemented');
  return renderToStaticMarkup(React.createElement(Component));
}

test('SSR exposes exactly the six public projects, native disclosure notes, and source caveats without JavaScript', () => {
  const html = renderReadingPage();
  assert.equal((html.match(/<article\b/g) || []).length, 6);
  const allowedIds = ['habibi-tech', 'cvs-health', 'for-our-liberation', 'ibm-maximo', 'sudanese-resistance-front', 'interactive-portfolio'];
  assert.deepEqual(Array.from(html.matchAll(/<article[^>]*id="([^"]+)"/g), match => match[1]), allowedIds);
  assert.equal((html.match(/<details\b/g) || []).length, 6);
  assert.equal((html.match(/<summary\b/g) || []).length, 6);
  assert.doesNotMatch(html, /<article[^>]*hidden/);
  assert.match(html, /id="project-filters"[^>]*hidden=""/);
  assert.match(html, /Proof of concept/);
  assert.match(html, /Prototype contributions/);
  assert.match(html, /Public source/);
  const allowedExternalSources = new Set([
    'https://github.com/noobianlabs/Portfolio-next/blob/main/apps/desktop/content/experience/habibi-tech.md',
    'https://github.com/noobianlabs/Portfolio-next/blob/main/apps/desktop/content/experience/cvs-health.md',
    'https://github.com/noobianlabs/Portfolio-next/blob/main/apps/desktop/content/experience/for-our-liberation.md',
    'https://github.com/noobianlabs/Portfolio-next/blob/main/apps/desktop/applications/About/Projects.tsx#L232-L255',
    'https://github.com/noobianlabs/Portfolio-next/blob/main/apps/desktop/content/experience/ibm-intern.md',
    'https://github.com/noobianlabs/Portfolio-next/blob/main/apps/desktop/applications/About/Projects.tsx#L284-L309',
    'https://github.com/noobianlabs/Portfolio-next/blob/main/README.md',
    'https://github.com/noobianlabs/Portfolio-next',
    'https://github.com/noobianlabs',
    'https://desktop-production-33b7.up.railway.app/',
  ]);
  const externalLinks = Array.from(html.matchAll(/href="(https?:[^"]+)"/g), match => match[1]);
  assert.deepEqual(new Set(externalLinks), allowedExternalSources);
  assert.equal((html.match(/<(?:img|iframe|video|audio)\b/g) || []).length, 0);
  assert.doesNotMatch(html, /private preview|private studio|owner.only/i);
});

test('SSR links to isolated studio and original homepage, retains public contact and framework credits', () => {
  const html = renderReadingPage();
  assert.match(html, /href="\/studio"/);
  assert.match(html, /href="\/"/);
  assert.match(html, /mailto:noobianlabs@gmail\.com/);
  assert.match(html, /Joey de Ruiter/);
  assert.match(html, /Henry Heffernan/);
  assert.doesNotMatch(html, /data-portfolio-ready="1"/);
  assert.match(html, /href="#projects"/);
});

test('native Next head deduplicates the legacy viewport without disabling zoom, and labels preview metadata honestly', () => {
  const pagePath = fileURLToPath(new URL('../apps/web/pages/portfolio.tsx', import.meta.url));
  assert.ok(existsSync(pagePath));
  const Page = require(pagePath).default;
  const Head = require('next/head').default;
  const { HeadManagerContext } = require('next/dist/shared/lib/head-manager-context.shared-runtime');
  let head = [];
  const manager = { mountedInstances: new Set(), updateHead(value) { head = value; } };
  renderToStaticMarkup(React.createElement(HeadManagerContext.Provider, { value: manager },
    React.createElement(Head, null, React.createElement('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' })),
    React.createElement(Page),
  ));
  const viewports = head.filter(item => item.type === 'meta' && item.props.name === 'viewport');
  assert.equal(viewports.length, 1);
  assert.equal(viewports[0].props.content, 'width=device-width, initial-scale=1');
  const robots = head.find(item => item.type === 'meta' && item.props.name === 'robots');
  assert.equal(robots.props.content, 'noindex, nofollow');
  const description = head.find(item => item.type === 'meta' && item.props.name === 'description').props.content;
  assert.match(description, /development preview.*public portfolio content/i);
  assert.doesNotMatch(description, /private|owner.only/i);
});

function frameFixture({ framed = true, parentHref = 'https://portfolio.example/studio-runtime/index.html' } = {}) {
  const events = new EventTarget();
  const attributes = new Map();
  const sent = [];
  const page = {
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
  };
  const window = {
    location: { href: 'https://portfolio.example/portfolio?embedded=1&_studioAttempt=7' },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  window.parent = framed ? {
    location: { href: parentHref },
    postMessage(data, origin) { sent.push({ data, origin, marker: attributes.get('data-portfolio-ready') }); },
  } : window;
  function key(key, prevented = false) {
    const event = new Event('keydown', { cancelable: true });
    Object.defineProperty(event, 'key', { value: key });
    if (prevented) event.preventDefault();
    events.dispatchEvent(event);
  }
  return { page, window, attributes, sent, key };
}

test('mount readiness is marked before messaging, and Escape reaches only the expected room origin', () => {
  assert.equal(typeof behavior.mountPortfolioBridge, 'function', 'the lifecycle-safe frame bridge is implemented');
  const fixture = frameFixture();
  const bridge = behavior.mountPortfolioBridge(fixture);
  assert.equal(bridge.embedded, true);
  assert.deepEqual(fixture.sent, [{ data: { type: 'studio:portfolio-ready', attempt: '7' }, origin: 'https://portfolio.example', marker: '1' }]);
  fixture.key('Enter');
  fixture.key('Escape', true);
  assert.equal(fixture.sent.length, 1);
  fixture.key('Escape');
  assert.deepEqual(fixture.sent[1], { data: { type: 'studio:close-computer', attempt: '7' }, origin: 'https://portfolio.example', marker: '1' });
  bridge.cleanup();
});

test('cleanup removes the live marker and Escape listener, including a Strict Mode remount', () => {
  assert.equal(typeof behavior.mountPortfolioBridge, 'function', 'the lifecycle-safe frame bridge is implemented');
  const fixture = frameFixture();
  const first = behavior.mountPortfolioBridge(fixture);
  first.cleanup();
  assert.equal(fixture.attributes.has('data-portfolio-ready'), false);
  fixture.key('Escape');
  assert.equal(fixture.sent.length, 1);
  const second = behavior.mountPortfolioBridge(fixture);
  fixture.key('Escape');
  assert.equal(fixture.sent.filter(message => message.data.type === 'studio:close-computer').length, 1);
  second.cleanup();
  assert.equal(fixture.attributes.has('data-portfolio-ready'), false);
});

test('standalone and untrusted embedding are readable but never send frame commands', () => {
  assert.equal(typeof behavior.mountPortfolioBridge, 'function', 'the lifecycle-safe frame bridge is implemented');
  for (const options of [{ framed: false }, { parentHref: 'https://untrusted.example/studio-runtime/index.html' }, { parentHref: 'https://portfolio.example/unrelated' }]) {
    const fixture = frameFixture(options);
    const bridge = behavior.mountPortfolioBridge(fixture);
    assert.equal(bridge.embedded, false);
    assert.equal(fixture.attributes.get('data-portfolio-ready'), '1');
    fixture.key('Escape');
    assert.deepEqual(fixture.sent, []);
    bridge.cleanup();
  }
});
