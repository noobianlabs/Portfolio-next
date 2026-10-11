import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const runtime = path.join(root, 'apps/web/public/studio-runtime');
const read = relative => readFile(path.join(runtime, relative), 'utf8');
const load = relative => import(pathToFileURL(path.join(runtime, relative)).href);
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(name)); else result.push(name);
  }
  return result;
}

test('studio route isolates its runtime and offers an accessible reading route', async () => {
  const source = await readFile(path.join(root, 'apps/web/pages/studio.tsx'), 'utf8').catch(() => '');
  assert.match(source, /<iframe\b/, 'the new route must render an isolated iframe');
  assert.match(source, /src="\/studio-runtime\/index\.html"/);
  assert.match(source, /title="[^"]+"/);
  assert.match(source, /href="\/portfolio"/);
  assert.match(source, /noindex, nofollow/);
  assert.match(source, /width=device-width, initial-scale=1, viewport-fit=cover/);
  assert.doesNotMatch(source, /maximum-scale|import\s.*studio\.js/);
  assert.match(source, /allow-downloads/);
});

test('shipped runtime contains only allowlisted files, original artwork and public sources', async () => {
  assert.equal(await stat(runtime).then(() => true, () => false), true, 'the sanitized runtime must exist');
  const names = await files(runtime);
  const allowedFiles = [
    'THIRD_PARTY.md', 'assets/study-organize-build.svg', 'computer-state.mjs',
    'index.html', 'portfolio-load.mjs', 'poster-backup-ui.mjs', 'poster-backup.mjs',
    'poster-ui.mjs', 'posters.json', 'posters.mjs', 'render-state.mjs', 'studio.js',
    'style.css', 'vendor/OrbitControls.js', 'vendor/THREE-LICENSE.txt',
    'vendor/three.core.js', 'vendor/three.module.js',
  ];
  assert.deepEqual(names.map(name => path.relative(runtime, name)).sort(), allowedFiles.sort());
  const images = names.filter(name => /\.(jpe?g|png|webp|svg)$/i.test(name));
  assert.deepEqual(images.map(name => path.relative(runtime, name)), ['assets/study-organize-build.svg']);
  const allowedURLs = new Set([
    'https://studio.invalid/', 'http://www.w3.org/2000/svg',
    'https://github.com/mrdoob/three.js/tree/r180',
  ]);
  const privateMetadata = /chatgpt\.site|owner-private|private.study|\.openai\/|screenshot|gitbundle|\/workspace\/|(?:site|deployment)Id\s*[:=]/i;
  for (const name of names) {
    const relative = path.relative(runtime, name);
    const source = await readFile(name, 'utf8');
    assert.doesNotMatch(source, privateMetadata, relative);
    if (!relative.startsWith('vendor/')) {
      for (const [url] of source.matchAll(/https?:\/\/[^\s"'<>`]+/g)) {
        assert.ok(allowedURLs.has(url), `${relative} contains an unapproved external source`);
      }
    }
  }
  const storyLinks = [...(await read('studio.js')).matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(storyLinks, ['/portfolio#projects', '/portfolio#projects']);
  const svg = await read('assets/study-organize-build.svg');
  assert.match(svg, /STUDY/); assert.match(svg, /ORGANIZE/); assert.match(svg, /BUILD/);
  assert.doesNotMatch(svg, /<image\b|<script\b|<foreignObject\b|href=/i);
});

test('all bundled local module, asset and document references exist', async () => {
  const paths = await files(runtime);
  for (const name of paths.filter(name => /\.(html|m?js|json|css)$/.test(name))) {
    const source = await readFile(name, 'utf8');
    const references = [...source.matchAll(/["'](\.\/[A-Za-z0-9_./-]+\.(?:m?js|css|svg|json|txt|html))(?:[?#][^"']*)?["']/g)];
    for (const [, reference] of references) {
      assert.equal(await stat(path.resolve(path.dirname(name), reference)).then(() => true, () => false), true, `${path.relative(runtime, name)} references ${reference}`);
    }
  }
  assert.doesNotMatch(await read('index.html'), /portfolio\.html/);
  assert.match(await read('studio.js'), /new URL\('\/portfolio\?embedded=1'/);
});

test('poster catalog and fallback use the same original artwork and a separate storage namespace', async () => {
  const catalog = JSON.parse(await read('posters.json'));
  const { validateCatalog, createPosterCollection } = await load('posters.mjs');
  assert.equal(validateCatalog(catalog), catalog);
  assert.equal(catalog.posters.length, 1);
  assert.equal(catalog.posters[0].id, 'study-organize-build');
  assert.equal(catalog.posters[0].image, './assets/study-organize-build.svg');
  const source = await read('posters.mjs');
  assert.match(source, /portfolio-studio-posters-v1/);
  assert.doesNotMatch(source, /['"]studio-posters-v1['"]/);
  assert.match(source, /originals/);
  assert.equal(typeof createPosterCollection, 'function');
  assert.doesNotMatch(await read('poster-ui.mjs'), /archive|private.study/i);
});

function loaderHarness(createPortfolioLoadController) {
  const origin = 'https://portfolio.example';
  let actualURL = 'about:blank';
  let marker = false;
  const timers = new Map();
  const frames = [];
  let timerId = 0;
  const frame = {
    contentWindow: { location: { replace(url) { actualURL = url; frames.push(url); marker = false; } } },
    get contentDocument() { return { URL: actualURL, readyState: 'complete', querySelector(selector) { return selector === '[data-portfolio-ready="1"]' && marker ? {} : null; } }; },
  };
  const controller = createPortfolioLoadController({
    frame, portfolioURL: `${origin}/portfolio`,
    schedule(callback) { timers.set(++timerId, callback); return timerId; },
    cancel(id) { timers.delete(id); },
  });
  const message = (overrides = {}) => ({ origin, source: frame.contentWindow,
    data: { type: 'studio:portfolio-ready', attempt: new URL(actualURL).searchParams.get('_studioAttempt') }, ...overrides });
  return { controller, frame, timers, frames, message, ready() { marker = true; }, navigate(url) { actualURL = url; } };
}

test('reading load waits for hydration and accepts only the current frame and attempt', async () => {
  const { createPortfolioLoadController } = await load('portfolio-load.mjs');
  const h = loaderHarness(createPortfolioLoadController);
  h.controller.open();
  h.controller.handleLoad();
  assert.equal(h.controller.getState().phase, 'loading');
  h.ready();
  h.controller.handleMessage(h.message({ origin: 'https://other.example' }));
  assert.equal(h.controller.getState().phase, 'loading');
  h.controller.handleMessage(h.message({ source: {} }));
  assert.equal(h.controller.getState().phase, 'loading');
  h.controller.handleMessage(h.message({ data: { type: 'studio:portfolio-ready', attempt: 'wrong' } }));
  assert.equal(h.controller.getState().phase, 'loading');
  h.controller.handleMessage(h.message());
  assert.equal(h.controller.getState().phase, 'ready');
  assert.equal(h.timers.size, 0);
});

test('reading retry ignores stale readiness and recovers from slow loading', async () => {
  const { createPortfolioLoadController } = await load('portfolio-load.mjs');
  const h = loaderHarness(createPortfolioLoadController);
  h.controller.open();
  const stale = h.message();
  [...h.timers.values()][0]();
  assert.equal(h.controller.getState().phase, 'slow');
  h.controller.retry(); h.ready();
  h.controller.handleMessage(stale);
  assert.equal(h.controller.getState().phase, 'loading');
  h.controller.handleMessage(h.message());
  assert.equal(h.controller.getState().phase, 'ready');
  assert.notEqual(h.frames[0], h.frames[1]);
  h.controller.close(); h.controller.open();
  assert.equal(h.frames.length, 2, 'a confirmed document should be reused');
});

test('reading readiness rejects redirects, duplicate tokens and messages after closure', async () => {
  const { createPortfolioLoadController } = await load('portfolio-load.mjs');
  for (const mutate of [url => url.replace('/portfolio?', '/other?'), url => `${url}&embedded=1`, url => `${url}&_studioAttempt=1`]) {
    const h = loaderHarness(createPortfolioLoadController);
    h.controller.open(); h.ready(); h.navigate(mutate(h.frames[0])); h.controller.handleLoad();
    assert.equal(h.controller.getState().phase, 'loading');
  }
  const h = loaderHarness(createPortfolioLoadController);
  h.controller.open(); const event = h.message(); h.controller.close(); h.ready(); h.controller.handleMessage(event);
  assert.equal(h.controller.getState().phase, 'idle');
  assert.equal(h.timers.size, 0);
});

test('backup retains bounded browser-local format and refuses remote and executable images', async () => {
  const { parseBackup, backupFromState, mergeBackup, BACKUP_LIMITS } = await load('poster-backup.mjs');
  const backup = backupFromState({ custom: [], pinned: ['study-organize-build'], source: 'ignored', hidden: ['ignored'] });
  assert.deepEqual(Object.keys(backup).sort(), ['format', 'images', 'pinned', 'version']);
  assert.deepEqual(parseBackup(JSON.stringify(backup)), backup);
  assert.equal(BACKUP_LIMITS.maxImages, 12); assert.equal(BACKUP_LIMITS.maxBytes, 8 * 1024 * 1024);
  for (const image of ['https://example.com/photo.png', 'data:image/svg+xml;base64,PHN2Zy8+']) {
    assert.throws(() => parseBackup(JSON.stringify({ ...backup, images: [{ id: 'custom-one', title: 'One', alt: 'One', image }] })), /local base64/);
  }
  const merge = mergeBackup({ custom: [], pinned: [] }, backup, ['study-organize-build']);
  assert.deepEqual(merge.pinned, ['study-organize-build']);
  assert.equal(merge.summary.newPins, 1);
});

test('isolated Three.js version is bundled with MIT attribution', async () => {
  assert.match(await read('vendor/three.core.js'), /REVISION\s*=\s*['"]180['"]/);
  assert.match(await read('vendor/THREE-LICENSE.txt'), /MIT License/);
  assert.match(await read('THIRD_PARTY.md'), /0\.180\.0/);
});

test('poster preferences preserve empty selections, original-print mode and corrupt storage', async (t) => {
  const { createPosterCollection } = await load('posters.mjs');
  const descriptors = new Map(['localStorage', 'document', 'Image', 'addEventListener', 'removeEventListener'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let stored = null;
  const writes = [];
  const collections = [];
  t.after(() => {
    for (const collection of collections) collection.dispose();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  });
  globalThis.localStorage = { getItem(key) { assert.equal(key, 'portfolio-studio-posters-v1'); return stored; }, setItem(key, value) { assert.equal(key, 'portfolio-studio-posters-v1'); stored = value; writes.push(value); } };
  globalThis.document = { hidden: false };
  globalThis.Image = class { decode() { return Promise.resolve(); } };
  globalThis.addEventListener = () => {};
  globalThis.removeEventListener = () => {};
  const statuses = [];
  const create = () => { const collection = createPosterCollection(() => {}, text => statuses.push(text)); collections.push(collection); return collection; };
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const collection = create();
  assert.equal(collection.current.id, 'study-organize-build');
  collection.setMode('originals'); await settle();
  assert.equal(collection.state.mode, 'originals');
  assert.equal(collection.current.id, 'study-organize-build');
  await collection.hide('study-organize-build');
  assert.equal(collection.current, null);
  assert.equal(collection.pool().length, 0);
  collection.restore(); await settle();
  assert.equal(collection.current.id, 'study-organize-build');
  collection.setMode('curated'); await settle();
  assert.equal(collection.current, null);
  collection.togglePin('study-organize-build'); await collection.next();
  assert.equal(collection.current.id, 'study-organize-build');
  collection.togglePin('study-organize-build'); await settle();
  assert.equal(collection.current, null);
  collection.togglePause(); collection.dispose();
  const reopened = create();
  assert.equal(reopened.state.paused, true);
  assert.equal(reopened.state.mode, 'curated');
  assert.equal(reopened.current, null);
  reopened.dispose();
  stored = '{invalid';
  const before = writes.length;
  const corrupt = create();
  assert.equal(corrupt.togglePin('study-organize-build'), false);
  assert.equal(writes.length, before);
  assert.equal(stored, '{invalid', 'unreadable user data must not be silently overwritten');
  await assert.rejects(corrupt.exportBackup(), /invalid or unsupported/);
  assert.ok(statuses.some(text => /preserved/.test(text)));
});

test('computer session preserves the first entry pose across repeated opening', async () => {
  const { createComputerSession, projectScreen } = await load('computer-state.mjs');
  const session = createComputerSession();
  assert.equal(session.active, false);
  assert.equal(session.enter({ walking: true, x: 4 }), true);
  assert.equal(session.enter({ walking: false, x: 9 }), false);
  assert.deepEqual(session.exit(), { walking: true, x: 4 });
  assert.equal(session.exit(), null);
  assert.equal(session.active, false);
  const matrix = projectScreen([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 100, 100, 2, 2, 1000, 800);
  assert.ok(matrix.every(Number.isFinite));
  assert.deepEqual(matrix.map(value => value || 0), [10, 0, 0, 0, 0, 8, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
});

test('idle render gate redraws only after meaningful camera, viewport or context changes', async () => {
  const { createRenderGate } = await load('render-state.mjs');
  const gate = createRenderGate();
  const camera = {
    position: { x: 0, y: 0, z: 0 },
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    projectionMatrix: { elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
  };
  assert.equal(gate.shouldRender(camera, 1200, 800), true);
  for (let i = 0; i < 100; i++) assert.equal(gate.shouldRender(camera, 1200, 800), false);
  camera.position.x = .2;
  assert.equal(gate.shouldRender(camera, 1200, 800), true);
  assert.equal(gate.shouldRender(camera, 1200, 800), false);
  assert.equal(gate.shouldRender(camera, 375, 812), true);
  const canvas = new EventTarget();
  gate.watch(canvas);
  assert.equal(gate.shouldRender(camera, 375, 812), false);
  canvas.dispatchEvent(new Event('webglcontextrestored'));
  assert.equal(gate.shouldRender(camera, 375, 812), true);
});

test('ordinary reading links leave the room wrapper without recursively nesting routes', async () => {
  const html = await read('index.html');
  const links = [...html.matchAll(/<a\b[^>]*href="\/portfolio(?:[?#][^"]*)?"[^>]*>/g)].map(match => match[0]);
  assert.ok(links.length >= 5);
  for (const link of links) assert.match(link, /target="(?:_top|_blank)"/, 'reading links must leave the inner runtime');
  const wrapper = await readFile(path.join(root, 'apps/web/pages/studio.tsx'), 'utf8');
  assert.match(wrapper, /allow-top-navigation-by-user-activation/);
  assert.doesNotMatch(wrapper, /allow-top-navigation(?:\s|["'])/);
  const monitor = /<iframe id="desktop-frame"[^>]+>/.exec(html)?.[0] || '';
  assert.match(monitor, /allow-top-navigation-by-user-activation/);
  assert.doesNotMatch(monitor, /allow-top-navigation(?:\s|["'])/);
});

test('Escape closes only an active room session for the current iframe load attempt', async () => {
  const { runInNewContext } = await import('node:vm');
  const { createPortfolioLoadController } = await load('portfolio-load.mjs');
  const { createComputerSession } = await load('computer-state.mjs');
  const source = await read('studio.js');
  const start = source.indexOf("addEventListener('message'");
  const end = source.indexOf("\n$('#computer-back')", start);
  assert.ok(start >= 0 && end > start);
  const h = loaderHarness(createPortfolioLoadController);
  const session = createComputerSession();
  let receive;
  let closed = 0;
  runInNewContext(source.slice(start, end), {
    URL,
    location: { origin: 'https://portfolio.example' },
    portfolioLoad: h.controller,
    computerSession: session,
    $(selector) { assert.equal(selector, '#desktop-frame'); return h.frame; },
    addEventListener(type, callback) { assert.equal(type, 'message'); receive = callback; },
    leaveComputer() { closed++; session.exit(); h.controller.close(); },
  });
  assert.equal(typeof receive, 'function');
  const closeMessage = () => {
    const event = h.message();
    return { ...event, data: { ...event.data, type: 'studio:close-computer' } };
  };
  h.controller.open(); session.enter({});
  const stale = closeMessage();
  h.controller.retry();
  receive(stale);
  assert.equal(closed, 0, 'queued Escape from a pre-retry document must not close the new attempt');
  const current = closeMessage();
  for (const invalid of [
    { ...current, source: {} },
    { ...current, origin: 'https://other.example' },
    { ...current, data: { type: 'studio:close-computer' } },
    { ...current, data: { ...current.data, attempt: 'wrong' } },
    { ...current, data: { ...current.data, attempt: Number(current.data.attempt) } },
    { ...current, data: { ...current.data, type: 'other' } },
  ]) {
    receive(invalid);
    assert.equal(closed, 0, 'wrong source, origin, type or nonmatching token must be ignored');
  }
  session.exit(); receive(current);
  assert.equal(closed, 0, 'an inactive room session must ignore Escape');
  session.enter({}); h.controller.close(); receive(current);
  assert.equal(closed, 0, 'a closed load controller must ignore Escape');
  h.controller.open(); receive(closeMessage());
  assert.equal(closed, 1, 'a valid current Escape closes the room computer');
  assert.equal(session.active, false);
  assert.equal(h.controller.getState().isOpen, false);
  receive(closeMessage());
  assert.equal(closed, 1, 'repeated messages after closure must be ignored');
});
