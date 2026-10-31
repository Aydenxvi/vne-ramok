'use strict';
const readline=require('node:readline/promises');
const {stdin,stdout}=require('node:process');
const {db,hashPassword}=require('./db');
(async()=>{
 const rl=readline.createInterface({input:stdin,output:stdout});
 try{
  const email=(await rl.question('Admin email: ')).trim().toLowerCase();
  const name=(await rl.question('Admin name: ')).trim();
  const password=await rl.question('Admin password (min 12 chars, visible in terminal): ');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<2||password.length<12)throw Error('Некорректный email, имя или пароль (от 12 символов).');
  const old=db.prepare('SELECT id,role FROM users WHERE email=?').get(email);
  if(old)db.prepare("UPDATE users SET name=?,passhash=?,role='admin' WHERE email=?").run(name,hashPassword(password),email);
  else db.prepare("INSERT INTO users(email,name,passhash,role) VALUES (?,?,?,'admin')").run(email,name,hashPassword(password));
  console.log('Admin saved. Start with npm start and open /admin.html');
 }catch(e){console.error(e.message);process.exitCode=1}finally{rl.close();db.close()}
})();
