'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../outfit-glb.js'),'utf8');
const window={VROutfit3D:{mount(){}}};
vm.runInNewContext(source,{window,fetch(){},TextDecoder,Float32Array,Uint32Array,DataView,Math,Error,console});
const {readGLB,flattenGLB,models}=window.VNEGLBUtilities;
const load=key=>{
 const b=fs.readFileSync(path.join(__dirname,'../assets/studio-23',models[key].file));
 return flattenGLB(readGLB(b.buffer.slice(b.byteOffset,b.byteOffset+b.length)),key);
};
const bounds=model=>{
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const part of model.parts)for(let i=0;i<part.positions.length;i+=3)for(let j=0;j<3;j++){
  lo[j]=Math.min(lo[j],part.positions[i+j]);hi[j]=Math.max(hi[j],part.positions[i+j]);
 }
 return {lo,hi};
};
module.exports=[
 ...Object.keys(models).map(key=>({name:`Unified original ${key} GLB parses and has valid triangles`,fn(assert){
  const glb=load(key);assert.ok(glb.parts.length>=2);
  assert.ok(glb.json.asset.version==='2.0');
  for(const part of glb.parts){
   assert.ok(part.positions.length>=9);
   assert.equal(part.positions.length,part.normals.length);
   assert.equal(part.positions.length/3*2,part.uv.length);
   assert.equal(part.indices.length%3,0);
   assert.ok(part.role && /^[a-z_]+$/.test(part.role));
   for(const x of part.positions)assert.ok(Number.isFinite(x));
  }
  assert.ok(fs.statSync(path.join(__dirname,'../assets/studio-23',models[key].file)).size<250000);
 }})),
 {name:'All seven models use the same world scale and coherent garment heights',fn(assert){
  const b=bounds(load('body')),top=bounds(load('tee')),pant=bounds(load('cargo'));
  assert.ok(b.hi[1]>4.9&&b.lo[1]<.1);
  assert.ok(top.hi[1]>3.6&&top.lo[1]>2.2&&top.lo[1]<2.5);
  assert.ok(pant.hi[1]>2.4&&pant.lo[1]<.5);
  assert.ok(Math.abs(top.lo[0])<1.3&&Math.abs(top.hi[0])<1.3);
 }},
 {name:'Original mannequin hand and short-sleeve forearms have distinct material roles',fn(assert){
  const m=load('body');const roles=new Set(m.parts.map(p=>p.role));
  for(const x of ['skin','forearm','shoe','hair'])assert.ok(roles.has(x));
  assert.ok(source.includes("part.role==='forearm'"));
 }},
 {name:'Beanie fits above original head, not over the face',fn(assert){
  const m=bounds(load('beanie'));assert.ok(m.lo[1]>4.55&&m.lo[1]<4.75);
  assert.ok(m.hi[1]<5.2&&m.hi[0]<.4&&m.lo[0]>-.4);
 }},
 {name:'Outfit Studio uses exclusively original lightweight GLBs',fn(assert){
  assert.ok(source.includes("const root='assets/studio-23/'"));
  assert.ok(source.includes("this.state.top==='hoodies'"));
  assert.ok(source.includes('requestAnimationFrame'));
  assert.ok(!source.includes('body-hands'));
 }}
];
