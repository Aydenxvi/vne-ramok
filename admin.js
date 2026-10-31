'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const M=n=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(n);
 let products=[],orders=[],editingId=null,imagePath='',originalPhoto=null,uploadedData=null;
 const status=s=>{$('admin-status').textContent=s||''};
 async function api(url,method='GET',body){
  const r=await fetch(url,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const d=await r.json().catch(()=>({error:'Нет связи с сервером.'}));if(!r.ok)throw Error(d.error||'Ошибка сервера.');return d;
 }
 async function boot(){
  try{const {user} = await api('/api/me');
   if(!user||user.role!=='admin'){ $('admin-gate').hidden=false;$('admin-workspace').hidden=true;return }
   $('admin-gate').hidden=true;$('admin-workspace').hidden=false;await refresh();
  }catch(e){status('Для работы админ-панели запусти node server.js и открой http://localhost:3000/admin.html. '+e.message)}
 }
 async function refresh(){
  try{
   const [s,pr,or]=await Promise.all([api('/api/admin/summary'),api('/api/admin/products'),api('/api/admin/orders')]);
   products=pr.products;orders=or.orders;
   $('admin-stats').innerHTML=[['ТОВАРОВ',s.stats.products],['ВСЕГО ЗАЯВОК',s.stats.orders],['НОВЫХ ЗАЯВОК',s.stats.newOrders],['СУММА ЗАЯВОК · НЕ ОПЛАЧЕНА',M(s.stats.amount)]].map(([k,v],i)=>`<div class="admin-stat ${i===2?'highlight':''}" style="animation-delay:${i*.06}s"><small>${k}</small><strong>${E(v)}</strong></div>`).join('');
   renderProducts();renderOrders();
  }catch(e){status(e.message)}
 }
 const statuses=['new','confirmed','packed','shipped','completed','cancelled'];
 const labels={new:'Новая',confirmed:'Подтверждена',packed:'Собрана',shipped:'Передана в доставку',completed:'Завершена',cancelled:'Отменена'};
 function renderOrders(){
  $('admin-orders').innerHTML=orders.length?orders.map((o,i)=>`<article class="admin-order" style="animation-delay:${Math.min(i*.05,.4)}s"><div><div class="eyebrow">${E(o.code)} / ${E(o.created_at)}</div><h3>${E(o.contact_name)}</h3><p>${E(o.contact_email)}</p><p>${E(o.address)}</p><small>Доставка: ${o.shipping==='express'?'Экспресс':'Стандарт'}<br>Комментарий: ${E(o.notes||'—')}</small></div><div><div class="eyebrow">CART CONTENTS / ${o.items.length}</div><div class="admin-order-list">${o.items.map(i=>`<div>${E(i.name)} · ${E(i.size)} / ${E(i.color)}<br>${i.qty} × ${M(i.price)}</div>`).join('')}</div></div><div><div class="eyebrow">TOTAL / REQUEST ONLY</div><strong>${M(o.total)}</strong><p>Скидка: ${M(o.discount)}<br>Доставка: ${M(o.shipping_fee)}<br>Оплата: НЕ ПОДКЛЮЧЕНА</p><label class="eyebrow">СТАТУС<select data-status="${o.id}" ${o.status==='cancelled'?'disabled':''}>${statuses.map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${labels[s]}</option>`).join('')}</select></label></div></article>`).join(''):'<p class="empty">Пока нет заявок. Оформи тестовую заявку в магазине.</p>';
 }
 function renderProducts(){
  $('admin-products').innerHTML=products.map((p,i)=>`<tr style="animation-delay:${Math.min(i*.035,.4)}s"><td>${E(p.name)}</td><td><code>${E(p.id)}</code></td><td>${M(p.price)}</td><td>${p.stock}</td><td>${p.active?'В магазине':'Скрыт'}</td><td><button data-edit="${E(p.id)}">ИЗМЕНИТЬ ↗</button></td></tr>`).join('');
 }
 function tab(which){
  for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===which);
  for(const t of ['orders','products','editor'])$('admin-'+t+'-panel').hidden=t!==which;
 }
 function reset(){editingId=null;imagePath='';originalPhoto=null;uploadedData=null;$('admin-product-form').reset();$('ad-id').readOnly=false;$('admin-editor-title').textContent='НОВЫЙ ТОВАР';$('admin-photo-preview').innerHTML='<div>VR<br>PHOTO</div>';status('')}
 function edit(id){
  const p=products.find(x=>x.id===id);if(!p)return;
  reset();editingId=id;imagePath=p.image||'';originalPhoto=Number.isInteger(p.photo)?p.photo:null;$('ad-id').readOnly=true;
  const form=$('admin-product-form');
  for(const key of ['id','name','category','price','stock','desc','fit','measurements','material','care'])form.elements[key].value=p[key]??'';
  form.elements.sizes.value=p.sizes.join(', ');
  form.elements.colors.value=(p.colors||[{name:p.color,hex:'#888888'}]).map(c=>`${c.name} ${c.hex}`).join('\n');
  form.elements.new.checked=!!p.new;form.elements.active.checked=!!p.active;
  if(imagePath)$('admin-photo-preview').innerHTML=`<img src="${E(imagePath)}" alt="Фото товара">`;
  else if(originalPhoto!==null)$('admin-photo-preview').innerHTML=`<div class="ad-campaign-crop" style="--panel:${originalPhoto}"><img src="assets/campaign.webp" alt="Фотография из демонстрационной кампании"></div>`;
  $('admin-editor-title').textContent='РЕДАКТИРОВАТЬ '+p.name;tab('editor');
 }
 for(const b of document.querySelectorAll('.admin-tabs [data-tab]'))b.onclick=()=>tab(b.dataset.tab);
 $('admin-new').onclick=()=>{reset();tab('editor')};$('admin-reset').onclick=reset;
 $('admin-refresh').onclick=refresh;
 $('admin-products').onclick=e=>{const t=e.target.closest('[data-edit]');if(t)edit(t.dataset.edit)};
 $('admin-orders').onchange=async e=>{
  const s=e.target.closest('[data-status]');if(!s)return;
  try{await api('/api/admin/orders/status','PATCH',{id:Number(s.dataset.status),status:s.value});status('Статус обновлён.');await refresh()}
  catch(err){status(err.message);await refresh()}
 };
 $('admin-login').onsubmit=async e=>{
  e.preventDefault();const f=new FormData(e.target);
  try{await api('/api/login','POST',{email:f.get('email'),password:f.get('password')});status('Администратор авторизован.');await boot()}
  catch(err){status(err.message)}
 };
 $('ad-photo').onchange=e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>2_000_000||!['image/webp','image/png','image/jpeg'].includes(file.type)){status('Поддерживается JPG, PNG, WEBP до 2 МБ.');e.target.value='';return}
  const reader=new FileReader();reader.onload=()=>{uploadedData=String(reader.result);$('admin-photo-preview').innerHTML=`<img src="${E(uploadedData)}" alt="Предпросмотр загруженного фото">`;status('Фото выбрано. Оно загрузится на сервер при сохранении товара.')};reader.readAsDataURL(file);
 };
 $('admin-product-form').onsubmit=async e=>{
  e.preventDefault();const f=new FormData(e.target),btn=$('ad-save');btn.disabled=true;
  try{
   const colors=String(f.get('colors')).split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{
    const match=line.match(/^(.+?)\s+(#[\da-f]{6})$/i);if(!match)throw Error('Цвета укажи по строке: Чёрный #1d1e1b');return {name:match[1],hex:match[2]};
   });
   if(uploadedData){const result=await api('/api/admin/upload','POST',{data:uploadedData});imagePath=result.url}
   const p={id:String(f.get('id')).trim(),name:String(f.get('name')).trim(),category:f.get('category'),price:Number(f.get('price')),stock:Number(f.get('stock')),sizes:String(f.get('sizes')).split(',').map(s=>s.trim()).filter(Boolean),colors,desc:f.get('desc'),fit:f.get('fit'),measurements:f.get('measurements'),material:f.get('material'),care:f.get('care'),image:imagePath,photo:uploadedData?undefined:originalPhoto,new:f.get('new')==='on',active:f.get('active')==='on'};
   await api('/api/admin/products',editingId?'PUT':'POST',p);
   status('Товар сохранён. Обнови магазин, чтобы увидеть изменения.');await refresh();edit(p.id);
  }catch(err){status(err.message)}finally{btn.disabled=false}
 };
 boot();
})();
