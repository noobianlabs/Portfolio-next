// One return point per session; repeated activation cannot overwrite it.
export function createComputerSession(){
 let saved=null;
 return {get active(){return saved!==null},enter(snapshot){if(saved!==null)return false;saved=snapshot;return true},exit(){const result=saved;saved=null;return result}};
}
// Map local CSS pixels onto a world plane through its clip-space matrix.
export function projectScreen(e,w,h,planeW,planeH,vw,vh){
 const x=planeW/w,y=-planeH/h,ox=-planeW/2,oy=planeH/2;
 const a=e[0]*x,b=e[1]*x,c=e[3]*x,d=e[4]*y,f=e[5]*y,g=e[7]*y;
 const tx=e[0]*ox+e[4]*oy+e[12],ty=e[1]*ox+e[5]*oy+e[13],tw=e[3]*ox+e[7]*oy+e[15];
 return [(a+c)*vw/2,(-b+c)*vh/2,0,c,(d+g)*vw/2,(-f+g)*vh/2,0,g,0,0,1,0,(tx+tw)*vw/2,(-ty+tw)*vh/2,0,tw];
}
