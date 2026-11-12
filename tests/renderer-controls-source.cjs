// Shared extraction for native controls and the manual real-React browser fixture.
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
function code() {
  const root = path.resolve(__dirname, '..');
  function select(file, names) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const nodes = ast.statements.filter(n => (ts.isFunctionDeclaration(n) || ts.isEnumDeclaration(n)) && names.includes(n.name?.text));
    if (nodes.length !== names.length) throw Error('Missing actual declarations');
    return nodes.map(n => n.getText(ast)).join('\n');
  }
  const declarations = select('apps/web/components/renderer/camera/CameraHandler.ts', ['CameraHandlerState']) + '\n' + select('apps/web/components/renderer/RendererUI.tsx', ['useSoundManagement', 'SoundManagementButton', 'ChangeSceneButton']);
  return ts.transpileModule('const {useState}=require("react"); const styles = new Proxy({}, {get: (_, key) => String(key)});\n' + declarations + '\nmodule.exports={CameraHandlerState,useSoundManagement,SoundManagementButton,ChangeSceneButton};', { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
}
module.exports = { code };
