import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url), ts = require('typescript');
const file = new URL('../apps/web/components/renderer/util.ts', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile('util.ts', source, ts.ScriptTarget.Latest, true);
const declarations = ast.statements.filter(n => ts.isFunctionDeclaration(n) && ['writeOutCharsStreaming', 'writeOutChars'].includes(n.name?.text));
assert.equal(declarations.length, 2);
const code = ts.transpileModule(declarations.map(n => n.getText(ast)).join('\n'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function fixture() {
  let now = 0, id = 0;
  const pending = new Map();
  const module = {exports:{}};
  runInNewContext(code, {module,exports:module.exports,setTimeout(fn, delay){const key=++id;pending.set(key,{fn,at:now+delay});return key;},clearTimeout(key){pending.delete(key);}});
  function take(){const [key, item]=[...pending].sort((a,b)=>a[1].at-b[1].at)[0] ?? [];assert.ok(item,'a timer should be pending');pending.delete(key);now=item.at;return item.fn;}
  return {...module.exports,pending,take,now:()=>now};
}
test('stream emits first character immediately and completes at the requested cadence without pending work',()=>{
 const f=fixture(),seen=[];f.writeOutCharsStreaming(()=> 'abc',v=>seen.push([f.now(),v]),35);
 assert.deepEqual(seen,[[0,'a']]);f.take()();assert.deepEqual(seen,[[0,'a'],[35,'ab']]);f.take()();assert.deepEqual(seen,[[0,'a'],[35,'ab'],[70,'abc']]);assert.equal(f.pending.size,0);
});
test('cancel releases the pending timer and is idempotent',()=>{
 const f=fixture(),seen=[];const cancel=f.writeOutCharsStreaming(()=> 'abc',v=>seen.push(v),35);cancel();cancel();assert.equal(f.pending.size,0);assert.deepEqual(seen,['a']);
});
test('already queued callback does not read stream or emit after cancellation',()=>{
 const f=fixture(),seen=[];let reads=0;const cancel=f.writeOutCharsStreaming(()=>{reads++;return 'abc';},v=>seen.push(v),35);const queued=f.take();cancel();queued();assert.equal(reads,1);assert.deepEqual(seen,['a']);assert.equal(f.pending.size,0);
});
test('empty stream emits its existing empty initial output without scheduling',()=>{
 const f=fixture(),seen=[];const cancel=f.writeOutCharsStreaming(()=>'',v=>seen.push(v),35);assert.deepEqual(seen,['']);assert.equal(f.pending.size,0);cancel();assert.equal(f.pending.size,0);
});
test('dynamic stream is reread for each live tick and can finish early',()=>{
 const f=fixture(),seen=[];let value='abcd';f.writeOutCharsStreaming(()=>value,v=>seen.push(v),12);value='xyz';f.take()();value='q';f.take()();assert.deepEqual(seen,['a','xy','q']);assert.equal(f.now(),24);assert.equal(f.pending.size,0);
});
test('writeOutChars forwards cancellation to the real streaming utility',()=>{
 const f=fixture(),seen=[];const cleanup=f.writeOutChars('hello',v=>seen.push(v),35);const queued=f.take();cleanup();queued();assert.deepEqual(seen,['h']);assert.equal(f.pending.size,0);
});
test('cancel during an output callback prevents another timer',()=>{
 const f=fixture(),seen=[];let cancel;cancel=f.writeOutCharsStreaming(()=> 'abcd',v=>{seen.push(v);if(v==='ab')cancel();},35);f.take()();assert.deepEqual(seen,['a','ab']);assert.equal(f.pending.size,0);
});
