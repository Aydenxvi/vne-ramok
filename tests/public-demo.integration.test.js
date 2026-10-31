'use strict';
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vne-public-demo-'));
const port=45000+crypto.randomInt(1000),base=`http://127.0.0.1:${port}`;
const env={...process.env,PUBLIC_DEMO:'1',VR_DATA_DIR:dir,HOST:'127.0.0.1',PORT:String(port)};
let server;
async function call(url,method='GET',data){const r=await fetch(base+url,{method,headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.text()}}
(async()=>{
 try{
  server=spawn(process.execPath,['server.js'],{cwd:root,env});
  let ready=false;
  for(let i=0;i<80;i++) {try{ready=(await call('/api/health')).status===200;if(ready)break}catch{}await new Promise(ok=>setTimeout(ok,50))}
  assert.ok(ready,'public demo server failed to start');
  const status=JSON.parse((await call('/api/health')).body);assert.equal(status.mode,'public-demo');
  const js=(await call('/server-catalog.js')).body;assert.match(js,/VR_PUBLIC_DEMO=true/);
  for(const [uri,method] of [['/api/admin/summary','GET'],['/api/register','POST'],['/api/login','POST'],['/api/favorites','GET'],['/api/my-orders','GET']]){
   const r=await call(uri,method,method==='POST'?{}:undefined);assert.equal(r.status,403,uri);
  }
  assert.equal((await call('/admin.html')).status,404);
  const order={name:'Demo Buyer',email:'demo@example.com',address:'Fictional Street 12, Demo City',shipping:'standard',agree:true,promo:'VNE10',items:[{id:'denim01',size:'30',color:'Индиго',qty:1}]};
  const result=await call('/api/orders','POST',order);assert.equal(result.status,201,result.body);
  const receipt=JSON.parse(result.body).order;
  assert.ok(receipt.code.startsWith('DEMO-'));
  assert.equal(receipt.saved,false);assert.equal(receipt.payment_status,'not_connected');
  const {DatabaseSync}=require('node:sqlite');const direct=new DatabaseSync(path.join(dir,'vneramok.sqlite'));
  assert.equal(direct.prepare('SELECT COUNT(*) n FROM orders').get().n,0,'demo wrote an order');
  assert.equal(direct.prepare('SELECT stock FROM products WHERE id=?').get('denim01').stock,20,'demo altered stock');
  assert.equal(direct.prepare('SELECT COUNT(*) n FROM users').get().n,0,'demo saved an account');
  direct.close();
  assert.equal((await call('/assets/studio-23/mannequin.glb')).status,200);
  console.log('  ok  public demo :: no PII persisted; checkout and receipt data work; admin and auth closed');
 }finally{server?.kill();fs.rmSync(dir,{recursive:true,force:true})}
})().catch(err=>{console.error(err);process.exitCode=1});
