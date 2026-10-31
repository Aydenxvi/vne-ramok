'use strict';
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const cartHelpers=require('../cart.js');
const directory=path.resolve(__dirname,'..');
function createHarness(){
 const elements=new Map();
 class TestElement{
  constructor(id){this.id=id;this.innerHTML='';this.textContent='';this.events={};this.focused=false;this.value='';this.classList={add(){},remove(){}};}
  addEventListener(name,handler){this.events[name]=handler}
  querySelector(){return {focus(){}}}
  get offsetWidth(){return 100}
  scrollIntoView(){}
  focus(){this.focused=true}
  click(target){if(this.events.click)this.events.click({target})}
  change(target){if(this.events.change)this.events.change({target})}
 }
 const getElement=id=>{if(!elements.has(id))elements.set(id,new TestElement(id));return elements.get(id)};
 const local={};const cart=[];const messages=[];
 const window={matchMedia:()=>({matches:false})};
 const context={window,document:{getElementById:getElement},localStorage:{getItem:key=>local[key]||null,setItem:(key,value)=>local[key]=value},CSS:{escape:s=>s},VRCart:cartHelpers,cart,money:v=>`${v} ₽`,visual:p=>`<div class="visual">${p.name}</div>`,toast:s=>messages.push(s),count:()=>{},showProduct:()=>{},console};
 vm.createContext(context);
 vm.runInContext(fs.readFileSync(path.join(directory,'products.js'),'utf8'),context);
 context.PRODUCTS=window.PRODUCTS;
 vm.runInContext(fs.readFileSync(path.join(directory,'wardrobe.js'),'utf8'),context);
 const click=(elem,data)=>getElement(elem).click({closest:selector=>{
   const name=selector.match(/\[data-([\w-]+)\]/)?.[1]?.replace(/-([a-z])/g,(_,s)=>s.toUpperCase());
   return name&&data[name]!==undefined?{dataset:data}:null;
  }});
 const size=(v)=>getElement('outfit-detail').change({id:'outfit-size',value:v});
 return {getElement,click,size,cart,messages,local};
}
module.exports=[
 {name:'lookbook renders two interactive outfits and matching item labels',fn(assert){
  const h=createHarness();assert.match(h.getElement('lookbook-stage').innerHTML,/data-hotspot="0"/);assert.match(h.getElement('lb-title').textContent,/CONCRETE DAYS/);h.getElement('lb-next').click();assert.strictEqual(h.getElement('lb-title').textContent,'OFF THE GRID');assert.match(h.getElement('lb-item-list').innerHTML,/CITY BOMBER/);
 }},
 {name:'builder uses real catalog prices and updates when switching looks',fn(assert){
  const h=createHarness();assert.strictEqual(h.getElement('outfit-total').textContent,'10980 ₽');h.getElement('lb-next').click();h.getElement('lb-style-it').click();assert.strictEqual(h.getElement('outfit-total').textContent,'20480 ₽');assert.match(h.getElement('outfit-pieces').innerHTML,/CITY BOMBER/);
 }},
 {name:'switching garment updates preview, selected product and total',fn(assert){
  const h=createHarness();h.click('outfit-tabs',{builderTab:'bottom'});h.click('outfit-choices',{builderItem:'pants01'});assert.match(h.getElement('outfit-pieces').innerHTML,/WIDE CARGO/);assert.strictEqual(h.getElement('outfit-total').textContent,'10480 ₽');assert.match(h.getElement('outfit-canvas').innerHTML,/outfit-legs-layer/);
 }},
 {name:'adding full look requires sizes and then uses existing cart API',fn(assert){
  const h=createHarness();h.getElement('outfit-add').click();assert.strictEqual(h.cart.length,0);assert.match(h.messages[0],/размер/);
  h.size('L');h.click('outfit-tabs',{builderTab:'bottom'});h.size('30');h.getElement('outfit-add').click();assert.strictEqual(h.cart.length,2);assert.strictEqual(h.cart[0].id,'tee02');assert.strictEqual(h.cart[1].id,'denim01');assert.strictEqual(cartHelpers.computeTotal(h.cart,harnessProducts()),10980);
 }},
 {name:'accessory is optional and can be included with selected size',fn(assert){
  const h=createHarness();h.click('outfit-tabs',{builderTab:'accessory'});h.click('outfit-choices',{builderItem:'hat01'});assert.strictEqual(h.getElement('outfit-total').textContent,'12970 ₽');h.size('ONE SIZE');h.click('outfit-tabs',{builderTab:'top'});h.size('S');h.click('outfit-tabs',{builderTab:'bottom'});h.size('28');h.getElement('outfit-add').click();assert.strictEqual(h.cart.length,3);assert.strictEqual(h.cart[2].id,'hat01');
 }}
];
function harnessProducts(){const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(directory,'products.js'),'utf8'),c);return c.window.PRODUCTS}
