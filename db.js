'use strict';
// Local development database. SQLite is bundled with Node.js 22+.
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const vm=require('node:vm');
const dataDir=process.env.VR_DATA_DIR?path.resolve(process.env.VR_DATA_DIR):path.join(__dirname,'data');
fs.mkdirSync(dataDir,{recursive:true});
const db=new DatabaseSync(path.join(dataDir,'vneramok.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, passhash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', addresses TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS sessions(tokenhash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY, data TEXT NOT NULL, stock INTEGER NOT NULL DEFAULT 20, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, contact_name TEXT NOT NULL, contact_email TEXT NOT NULL, address TEXT NOT NULL, shipping TEXT NOT NULL, subtotal INTEGER NOT NULL, discount INTEGER NOT NULL, shipping_fee INTEGER NOT NULL, total INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'new', payment_status TEXT NOT NULL DEFAULT 'not_connected', notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id TEXT NOT NULL, name TEXT NOT NULL, color TEXT NOT NULL, size TEXT NOT NULL, qty INTEGER NOT NULL, price INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS favorites(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, product_id TEXT NOT NULL, PRIMARY KEY(user_id,product_id));`);
if(db.prepare('SELECT COUNT(*) AS n FROM products').get().n===0){
 const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'products.js'),'utf8'),ctx);
 const ins=db.prepare('INSERT INTO products(id,data,stock,active) VALUES (?,?,?,1)');
 for(const p of ctx.window.PRODUCTS)ins.run(p.id,JSON.stringify(p),20);
}
const hashPassword=(value,salt=crypto.randomBytes(16).toString('hex'))=>salt+':'+crypto.scryptSync(value,salt,64).toString('hex');
function verifyPassword(value,stored){try{const [salt,hashed]=stored.split(':');const buf=Buffer.from(hashed,'hex');return buf.length===64&&crypto.timingSafeEqual(crypto.scryptSync(value,salt,64),buf)}catch{return false}}
const parseRow=row=>row&&({...JSON.parse(row.data),stock:row.stock,active:!!row.active});
const allProducts=(admin=false)=>db.prepare(admin?'SELECT * FROM products ORDER BY created_at, id':'SELECT * FROM products WHERE active=1 ORDER BY created_at, id').all().map(parseRow);
module.exports={db,hashPassword,verifyPassword,allProducts,parseRow,dataDir};
