'use strict';
const Receipt = require('../receipt.js');
const sample={code:'VR-123',saved:true,date:new Date('2026-10-31T12:00:00Z'),lines:[{name:'WASHED DENIM 02',size:'M',color:'Чёрный',qty:2,price:8490}],subtotal:16980,discount:1698,shippingFee:390,total:15672};
module.exports=[
 {name:'saved receipt includes code, products, total and payment disclaimer',fn(assert){
  const s=Receipt.render(sample);
  assert.ok(s.includes('VR-123'));assert.ok(s.includes('WASHED DENIM 02'));
  assert.ok(s.includes('15 672')||s.includes('15 672'));assert.ok(s.includes('ЗАЯВКА СОХРАНЕНА'));assert.ok(s.includes('ДЕНЬГИ НЕ СПИСАНЫ'));
 }},
 {name:'code and line fields cannot inject HTML',fn(assert){
  const s=Receipt.render({...sample,code:'<script>alert(1)</script>',lines:[{...sample.lines[0],name:'<img src=x onerror=alert(1)>'}]});
  assert.ok(!s.includes('<script>'));assert.ok(!s.includes('<img'));
  assert.ok(s.includes('&lt;script&gt;'));assert.ok(s.includes('&lt;img'));
 }},
 {name:'unsaved preview is clearly marked as not saved',fn(assert){
  assert.ok(Receipt.render({...sample,saved:false}).includes('НЕ СОХРАНЕНО'));
 }}
];
