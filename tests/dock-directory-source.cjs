// Actual Dock item and nested directory constructor, with external boundaries supplied.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),{runInNewContext}=require('node:vm');
const file=path.resolve(__dirname,'../apps/desktop/components/Dock/Dock.tsx');
function load(manager,hooks=require('react')){
 const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),found=[];
 function visit(n){if(ts.isFunctionDeclaration(n)&&['DockItemDirectory','constructDirectoryItems'].includes(n.name?.text))found.push(n.getText(ast));ts.forEachChild(n,visit);}visit(ast);if(found.length!==2)throw Error('Missing actual Dock declarations');
 const code=ts.transpileModule(found.join('\n')+'\nmodule.exports={DockItemDirectory,constructDirectoryItems};',{compilerOptions:{target:ts.ScriptTarget.ES2015,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const module={exports:{}};runInNewContext(code,{module,exports:module.exports,require,manager,...hooks,styles:new Proxy({},{get:(_,key)=>String(key)}),FileSystemItemDragEnter:'fs_item_drag_enter',FileSystemItemDragLeave:'fs_item_drag_leave',FileSystemItemDragDrop:'fs_item_drag_drop'});return module.exports;
}
module.exports={load};
