// Keep input and damping updates running, but redraw the GPU scene only when
// its camera, viewport, or visible content changed since the last drawn frame.
export function createRenderGate(){
 let previous=null,dirty=true;
 return {
  invalidate(){dirty=true},
  watch(canvas){canvas.addEventListener('webglcontextrestored',()=>{dirty=true})},
  shouldRender(camera,width,height){
   const values=[camera.position.x,camera.position.y,camera.position.z,camera.quaternion.x,camera.quaternion.y,camera.quaternion.z,camera.quaternion.w,...camera.projectionMatrix.elements,width,height];
   if(!dirty&&previous&&values.every((value,i)=>Math.abs(value-previous[i])<1e-7))return false;
   previous=values;dirty=false;return true;
  }
 };
}
