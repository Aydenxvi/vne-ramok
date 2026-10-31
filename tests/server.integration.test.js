'use strict';
// Integration smoke checks with disposable SQLite file and localhost server.
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawn,execFileSync}=require('node:child_process');
const crypto=require('node:crypto');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vne-test-'));
const port=42000+crypto.randomInt(1000);
const base=`http://127.0.0.1:${port}`;
const env={...process.env,PORT:String(port),VR_DATA_DIR:dir};
const userEmail='test'+crypto.randomBytes(4).toString('hex')+'@example.com';
let server=null,customerCookie='',adminCookie='',passed=0,uploadedFile=null;
async function api(route,{method='GET',body,cookie=''}={}){
 const r=await fetch(base+route,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
 const d=await r.text();let json;try{json=JSON.parse(d)}catch{json={raw:d}};
 return {code:r.status,body:json,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
}
async function check(name,fn){await fn();++passed;console.log('  ok  server :: '+name)}
async function main(){
 const creds={name:'Test administrator',email:'admin@example.com',password:'a-test-strong-password-123'};
 execFileSync(process.execPath,['-e',`const {db,hashPassword}=require('./db');db.prepare("INSERT INTO users(email,name,passhash,role) VALUES (?,?,?,'admin')").run(${JSON.stringify(creds.email)},${JSON.stringify(creds.name)},hashPassword(${JSON.stringify(creds.password)}));db.close();`],{cwd:path.resolve(__dirname,'..'),env,stdio:'ignore'});
 server=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env,stdio:'ignore'});
 for(let i=0;i<60;i++){try{if((await api('/api/health')).code===200)break}catch{}await new Promise(r=>setTimeout(r,80))}
 await check('public health and live catalog',async()=>{
  const a=await api('/api/health');assert.equal(a.code,200);const b=await api('/api/products');assert.equal(b.body.products.length,8);
  const c=await fetch(base+'/server-catalog.js');assert.match(await c.text(),/VR_SERVER_MODE=true/);
 });
 await check('register, session and editable profile',async()=>{
  const r=await api('/api/register',{method:'POST',body:{name:'QA Buyer',email:userEmail,password:'secret-long-42'}});
  assert.equal(r.code,201);customerCookie=r.cookie;assert.match(customerCookie,/vr_session=/);
  assert.equal((await api('/api/me',{cookie:customerCookie})).body.user.email,userEmail);
  const u=await api('/api/profile',{method:'PUT',cookie:customerCookie,body:{name:'New Buyer',addresses:['Street 10, City']}});assert.equal(u.code,200);
 });
 await check('favorites and customer access checks',async()=>{
  const r=await api('/api/favorites',{method:'PUT',cookie:customerCookie,body:{ids:['denim01','denim02','wrong']}});assert.equal(r.code,200);
  assert.deepEqual((await api('/api/favorites',{cookie:customerCookie})).body.favorites.sort(),['denim01','denim02']);
  assert.equal((await api('/api/admin/summary',{cookie:customerCookie})).code,403);
 });
 await check('server calculates shipping, promo and saves order',async()=>{
  const request={name:'QA Buyer',email:userEmail,address:'Street 10, City',shipping:'standard',promo:'VNE10',agree:true,items:[{id:'denim01',color:'Индиго',size:'30',qty:1}]};
  const r=await api('/api/orders',{method:'POST',cookie:customerCookie,body:request});assert.equal(r.code,201);
  assert.equal(r.body.order.total,7581);assert.equal(r.body.order.payment_status,'not_connected');
  assert.equal(r.body.order.subtotal,7990);assert.equal(r.body.order.discount,799);assert.equal(r.body.order.shipping_fee,390);
  assert.equal((await api('/api/products')).body.products.find(x=>x.id==='denim01').stock,19);
  const o=await api('/api/my-orders',{cookie:customerCookie});assert.equal(o.body.orders.length,1);
 });
 await check('bad variant, bad quantity and no agreement rejected',async()=>{
  let r=await api('/api/orders',{method:'POST',body:{name:'QA',email:userEmail,address:'Street 10 City',shipping:'standard',agree:true,items:[{id:'denim01',size:'777',color:'Индиго',qty:1}]}});assert.equal(r.code,400);
  r=await api('/api/orders',{method:'POST',body:{name:'QA',email:userEmail,address:'Street 10 City',shipping:'standard',agree:false,items:[{id:'denim01',size:'30',color:'Индиго',qty:1}]}});assert.equal(r.code,400);
 });
 await check('admin login, order status and restock on cancellation',async()=>{
  const r=await api('/api/login',{method:'POST',body:{email:creds.email,password:creds.password}});assert.equal(r.code,200);adminCookie=r.cookie;
  const orders=(await api('/api/admin/orders',{cookie:adminCookie})).body.orders;
  assert.equal(orders.length,1);
  const update=await api('/api/admin/orders/status',{method:'PATCH',cookie:adminCookie,body:{id:orders[0].id,status:'cancelled'}});assert.equal(update.code,200);
  assert.equal((await api('/api/products')).body.products.find(x=>x.id==='denim01').stock,20);
  const retry=await api('/api/admin/orders/status',{method:'PATCH',cookie:adminCookie,body:{id:orders[0].id,status:'new'}});assert.equal(retry.code,409);
 });
 await check('admin adds and hides a product; catalog updates dynamically',async()=>{
  const p={id:'test-studio-01',name:'STUDIO TEST PIECE',category:'tees',price:4500,stock:5,sizes:['S','L'],colors:[{name:'Чёрный',hex:'#1d1e1b'}],desc:'Test only',new:true,active:true};
  assert.equal((await api('/api/admin/products',{method:'POST',cookie:adminCookie,body:p})).code,200);
  assert.ok((await api('/api/products')).body.products.some(x=>x.id===p.id));
  assert.equal((await api('/api/admin/products',{method:'PUT',cookie:adminCookie,body:{...p,active:false}})).code,200);
  assert.ok(!(await api('/api/products')).body.products.some(x=>x.id===p.id));
 });
 await check('photo upload uses validated image and reusable server URL',async()=>{
  const data=fs.readFileSync(path.resolve(__dirname,'../assets/lookbook-02.webp')).toString('base64');
  const r=await api('/api/admin/upload',{method:'POST',cookie:adminCookie,body:{data:'data:image/webp;base64,'+data}});
  assert.equal(r.code,201);
  assert.match(r.body.url,/^\/uploads\/[0-9a-f]{32}\.webp$/);
  uploadedFile=path.resolve(__dirname,'..',r.body.url.slice(1));
  assert.ok(fs.existsSync(uploadedFile));
  const serve=await fetch(base+r.body.url);assert.equal(serve.status,200);
  const bad=await api('/api/admin/upload',{method:'POST',cookie:adminCookie,body:{data:'data:image/png;base64,'+Buffer.alloc(150).toString('base64')}});
  assert.equal(bad.code,400);
 });
 await check('secure static paths and logout',async()=>{
  assert.equal((await api('/data/vneramok.sqlite')).code,404);
  assert.equal((await api('/admin.html')).code,200);
  assert.equal((await api('/robots.txt')).code,200);
  assert.equal((await api('/api/logout',{method:'POST',cookie:customerCookie,body:{}})).code,200);
  assert.equal((await api('/api/my-orders',{cookie:customerCookie})).code,401);
 });
 console.log(`\n${passed} server integration tests passed`);
}
main().catch(e=>{console.error('FAIL server integration:',e);process.exitCode=1}).finally(()=>{if(server)server.kill();if(uploadedFile)fs.rmSync(uploadedFile,{force:true});fs.rmSync(dir,{recursive:true,force:true})});
