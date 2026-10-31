'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const wardrobe=fs.readFileSync(path.join(root,'wardrobe.js'),'utf8');
const glb=fs.readFileSync(path.join(root,'outfit-glb.js'),'utf8');
const backend=fs.readFileSync(path.join(root,'server/public-demo.js'),'utf8');
const order=fs.readFileSync(path.join(root,'server/routes/orders.js'),'utf8');
module.exports=[
 {name:'HTML loads version 23 module and matches visible Studio status',fn(assert){
  assert.ok(html.includes('VNE 23 / ORIGINAL'));
  assert.ok(html.includes('outfit-glb.js?v=23'));
  assert.ok(wardrobe.includes('3D МОДЕЛЬ / 360°'));
 }},
 {name:'Unified 3D controls offer rotation, zoom and keyboard access',fn(assert){
  for(const str of ['pointerdown','pointermove','pointercancel','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','data-orbit="front"'])assert.ok(glb.includes(str),str);
 }},
 {name:'Public demo disables account and admin API calls and rate-limits checkout',fn(assert){
  assert.ok(backend.includes('PUBLIC_DEMO'));assert.ok(backend.includes('admin\\/'));
  assert.ok(backend.includes("hits.get(ip)"));
 }},
 {name:'Demo orders validate server-side prices but do not write contact data or decrement stock',fn(assert){
  assert.ok(order.includes('if (publicDemo)'));
  const demo=order.slice(order.indexOf('if (publicDemo)'),order.indexOf("db.exec('BEGIN IMMEDIATE')"));
  assert.ok(demo.includes('checkedOrder(d.items)'));assert.ok(demo.includes('saved: false'));
  assert.ok(!demo.includes('INSERT INTO'));assert.ok(!demo.includes('stock=stock'));
 }},
 {name:'Public deployment uses explicit demo mode and non-root image',fn(assert){
  const docker=fs.readFileSync(path.join(root,'Dockerfile'),'utf8');
  const yaml=fs.readFileSync(path.join(root,'render.yaml'),'utf8');
  assert.ok(docker.includes('USER node'));assert.ok(docker.includes('PUBLIC_DEMO=1'));
  assert.ok(yaml.includes('PUBLIC_DEMO'));
 }}
];

// Deployment readiness: checkout must never solicit real personal details in public demo.
