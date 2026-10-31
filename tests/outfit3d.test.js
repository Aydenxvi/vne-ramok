'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../outfit-3d.js'),'utf8');
function scene(withGl=true){
 const activity={draws:0,uploads:[],colors:[],buffers:0};
 const gl={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,DEPTH_TEST:2929,CULL_FACE:2884,LEQUAL:515,
  ARRAY_BUFFER:34962,STATIC_DRAW:35044,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,FLOAT:5126,TRIANGLES:4,
  createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,deleteShader(){},
  createProgram:()=>({}),attachShader(){},linkProgram(){},getProgramParameter:()=>true,deleteProgram(){},
  useProgram(){},getAttribLocation:()=>1,getUniformLocation:(_,n)=>n,enable(){},disable(){},depthFunc(){},
  createBuffer:()=>{activity.buffers++;return {}},deleteBuffer(){},bindBuffer(){},bufferData:(_,v)=>activity.uploads.push(v.length),
  viewport(){},clearColor(){},clear(){},uniform1f(){},uniform3fv:(_,v)=>activity.colors.push([...v]),
  enableVertexAttribArray(){},vertexAttribPointer(){},drawArrays:()=>{activity.draws++},isContextLost:()=>false};
 const makeNode=tag=>({tagName:tag,events:{},className:'',style:{},width:0,height:0,tabIndex:-1,
  addEventListener(n,cb){this.events[n]=cb},setAttribute(){},setPointerCapture(){},closest(){return null}});
 const stage={classList:{active:[],add(n){this.active.push(n)}},events:{},children:[],
  appendChild(n){this.children.push(n)},getBoundingClientRect:()=>({width:530,height:720})};
 const doc={hidden:false,events:{},createElement(tag){const n=makeNode(tag);if(tag==='canvas')n.getContext=()=>withGl?gl:null;return n},addEventListener(n,cb){this.events[n]=cb},dispatchEvent(){} };
 const context={window:{devicePixelRatio:1},document:doc,console,Float32Array,Math,Error,Event:class{constructor(name){this.type=name}},
  requestAnimationFrame:cb=>cb(),ResizeObserver:class{observe(){}disconnect(){}},
  IntersectionObserver:class{constructor(cb){this.cb=cb}observe(){this.cb([{isIntersecting:true}])}disconnect(){}}};
 vm.createContext(context);vm.runInContext(source,context);
 const app=context.window.VROutfit3D.mount(stage);
 return {app,stage,activity};
}
const outfit={top:'hoodies',bottom:'pants',hat:true,tc:'#282b29',bc:'#92856f',hc:'#1d1e1b',topName:'ZIP HOODIE',bottomName:'CARGO',hatName:'BEANIE'};
module.exports=[
 {name:'3D procedural mannequin uploads real 3D geometry and renders on demand',fn(assert){
  const {app,activity,stage}=scene();assert.ok(app);app.update(outfit);
  assert.ok(activity.uploads.length>=30,'geometry buffers were uploaded');assert.ok(activity.uploads.some(n=>n>200),'3D triangles generated');
  assert.ok(activity.draws>=12,'model parts rendered');assert.ok(stage.classList.active.includes('outfit-3d-active'));
 }},
 {name:'3D renderer changes garment colors and supports multiple category silhouettes',fn(assert){
  const {app,activity}=scene();app.update(outfit);const first=activity.colors.length;
  app.update({...outfit,top:'tees',bottom:'jeans',hat:false,tc:'#c2bfae',bc:'#3b4f78'});
  assert.ok(activity.colors.length>first);assert.ok(activity.buffers>=30);
 }},
 {name:'3D model supports keyboard orbit without continuous redraw',fn(assert){
  const {app,activity}=scene();app.update(outfit);const initial=app.yaw,before=activity.draws;
  app.canvas.events.keydown({key:'ArrowRight',preventDefault(){}});
  assert.ok(app.yaw>initial);assert.ok(activity.draws>before);
 }},
 {name:'3D renderer gracefully returns to SVG on devices without WebGL',fn(assert){
  const {app,stage}=scene(false);assert.strictEqual(app,null);assert.ok(!stage.classList.active.includes('outfit-3d-active'));
 }}
];
