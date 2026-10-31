'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
module.exports=[
 {name:'Footer displays current version',fn:assert=>{assert.match(read('index.html'),/VNE RAMOK 26 \/ PUBLIC DEMO/);assert.doesNotMatch(read('index.html'),/MOTION 18 · 3D FIX/);}},
 {name:'Checkout demo label and saved local mode',fn:assert=>{const js=read('storefront.js');assert.match(js,/orderActionLabel=publicDemo\?/);assert.match(js,/ОФОРМИТЬ ДЕМО-ЗАКАЗ/);assert.match(js,/ОТПРАВИТЬ ЗАЯВКУ/);assert.match(js,/printReceipt\(receiptSummary/);}},
 {name:'Public GitHub action preserves local profile',fn:assert=>{const js=read('storefront.js');assert.match(js,/if\(publicDemo\)\{window.open\(githubUrl/);assert.match(js,/renderProfile\(\):renderVisitor\(\)/);}},
 {name:'Social cards and favicon have actual assets',fn:assert=>{const html=read('index.html');assert.match(html,/property="og:image"/);assert.match(html,/name="twitter:card"/);for(const file of ['assets/favicon.svg','assets/social-preview.jpg'])assert.ok(fs.statSync(path.join(root,file)).size>100);}},
 {name:'Repo and public links included in README',fn:assert=>{assert.match(read('README.md'),/vne-ramok-portfolio\.onrender\.com/);assert.match(read('README.md'),/github\.com\/Aydenxvi\/vne-ramok/);}}
];
