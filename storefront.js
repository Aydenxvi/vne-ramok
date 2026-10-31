'use strict';
/* Connected checkout and account experience. The file:// experience remains a
   visual preview; /api endpoints are available only through `node server.js`. */
(()=>{
 const $=id=>document.getElementById(id);
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const M=window.VRStore.money;
 const connected=window.VR_SERVER_MODE===true;
 const publicDemo=window.VR_PUBLIC_DEMO===true;
 const githubUrl='https://github.com/Aydenxvi/vne-ramok';
 // Public portfolio demo has no accounts: expose the source instead of a disabled login.
 if(publicDemo){
  const accountButton=$('account-open');
  accountButton.innerHTML='GITHUB <span aria-hidden="true">↗</span>';
  accountButton.setAttribute('aria-label','Исходный код VNE RAMOK на GitHub (новая вкладка)');
  accountButton.title='Посмотреть исходный код проекта';
 }
 const orderActionLabel=publicDemo?'ОФОРМИТЬ ДЕМО-ЗАКАЗ ↗':'ОТПРАВИТЬ ЗАЯВКУ ↗';
 const CHECK_SVG='<svg class="order-check" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12.5L9.5 18L20 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 let me=null,loginTab='login',myOrders=[],myFavorites=[],orderState='idle';
 async function api(url,method='GET',body){
  const r=await fetch(url,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const data=await r.json().catch(()=>({error:'Сервер недоступен.'}));
  if(!r.ok)throw Error(data.error||'Ошибка запроса.');
  return data;
 }
 function shipping(){return document.querySelector('input[name=delivery]:checked')?.value||'standard'}
 function calc(){
  const lines=window.VRStore.getCart().map(i=>({item:i,p:PRODUCTS.find(p=>p.id===i.id)})).filter(x=>x.p);
  const sub=lines.reduce((n,x)=>n+x.p.price*x.item.qty,0);
  const coupon=$('order-promo').value.trim().toUpperCase();
  const discount=coupon==='VNE10'?Math.round(sub*.1):0;
  const fee=shipping()==='express'?890:(sub-discount>=12000?0:390);
  return {lines,sub,discount,fee,total:sub-discount+fee,coupon};
 }
 function updateCheckout(){
  const t=calc();
  $('order-lines').innerHTML=t.lines.map(({item,p})=>`<div class="order-line"><span>${item.qty} × <b>${E(p.name)}</b><small>${E(item.color)} / ${E(item.size)}</small></span><strong>${M(p.price*item.qty)}</strong></div>`).join('')||'<p class="muted">Корзина пуста.</p>';
  $('order-breakdown').innerHTML=`<div><span>Товары</span><span>${M(t.sub)}</span></div><div><span>Скидка ${t.discount?'· VNE10':''}</span><span>−${M(t.discount)}</span></div><div><span>Доставка</span><span>${t.fee===0?'Бесплатно':M(t.fee)}</span></div><div class="total"><strong>ИТОГО</strong><strong>${M(t.total)}</strong></div>`;
  $('order-submit').disabled=!t.lines.length;
 }
 $('checkout-open').onclick=()=>{
  if(!window.VRStore.getCart().length)return;
  $('cart-dialog').close();
  orderState='idle';
  $('order-message').textContent='';$('order-submit').disabled=false;
  $('order-submit').classList.remove('processing','success');
  $('order-submit').innerHTML='<span>'+orderActionLabel+'</span>';
  $('receipt-stage').hidden=true; $('receipt-stage').classList.remove('is-printing'); $('receipt-paper').innerHTML='';
  $('order-agree').checked=false;
  $('order-promo').value='';$('order-notes').value='';
  if(me){$('order-name').value=me.name;$('order-email').value=me.email;$('order-address').value=me.addresses?.[0]||''}
  if(publicDemo){
   const fixed={'order-name':'Demo Visitor','order-email':'demo@example.com','order-address':'Fictional Street 12, Demo City','order-notes':''};
   for(const [id,value] of Object.entries(fixed)){
    $(id).value=value;
    $(id).readOnly=true;
   }
   const disclaimer=$('order-agree').closest('label')?.querySelector('span');
   if(disclaimer)disclaimer.textContent='Я понимаю, что это демонстрация: данные вымышленные, заявка не сохраняется и оплата не производится.';
  }
  $('order-mode-note').textContent=publicDemo?'ПУБЛИЧНОЕ ДЕМО: используйте только вымышленные данные. Заказ НЕ сохраняется, платежей нет.':connected?'Заказ сохраняется на локальном сервере. Платежи НЕ подключены.':'Режим просмотра: заявка не отправляется и не сохраняется на сервере.';
  updateCheckout();$('order-dialog').showModal();
 };
 for(const radio of document.querySelectorAll('input[name=delivery]'))radio.addEventListener('change',updateCheckout);
 $('order-promo').addEventListener('input',updateCheckout);
 $('receipt-replay').addEventListener('click',()=>{const stage=$('receipt-stage');if(stage.hidden)return;stage.classList.remove('is-printing');void stage.offsetWidth;stage.classList.add('is-printing');});
 function printReceipt(summary, savedOrder){
  const order = savedOrder || {};
  const saved = Boolean(savedOrder);
  $('receipt-paper').innerHTML = VRReceipt.render({
   saved,code:saved?order.code:'DEMO-'+String(Date.now()).slice(-6),
   date:new Date(),lines:summary.lines.map(({item,p})=>({qty:item.qty,name:p.name,size:item.size,color:item.color,price:p.price})),
   subtotal: saved ? order.subtotal : summary.sub,
   discount: saved ? order.discount : summary.discount,
   shippingFee: saved ? order.shipping_fee : summary.fee,
   total: saved ? order.total : summary.total
  });
  const stage=$('receipt-stage');stage.hidden=false;stage.classList.remove('is-printing');void stage.offsetWidth;stage.classList.add('is-printing');
  // The checkout dialog scrolls internally; reveal the receipt after it becomes visible.
  requestAnimationFrame(()=>stage.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));
 }

 $('order-submit').addEventListener('click',async()=>{
  // Real order submission reuses the same idle→processing→success|error
  // state machine the old visual-only payment demo used (payment.js,
  // still covered by tests/payment.test.js) — now driving an actual fetch
  // instead of a fixed timeout.
  if(!VRPayment.canSubmit(orderState))return;
  const d={name:$('order-name').value.trim(),email:$('order-email').value.trim(),address:$('order-address').value.trim(),notes:$('order-notes').value.trim(),shipping:shipping(),promo:$('order-promo').value.trim(),agree:$('order-agree').checked,items:window.VRStore.getCart()};
  const report=msg=>{$('order-message').textContent=msg};
  if(!VRCheckout.validateContact(d).valid){report('Проверь имя, email и адрес доставки.');return}
  if(!d.agree){report('Подтверди согласие для оформления заявки.');return}
  if(!d.items.length){report('Корзина пуста.');return}
  const receiptSummary=calc();
  orderState=VRPayment.nextState(orderState,'submit');
  const button=$('order-submit');
  button.disabled=true;button.classList.remove('success');button.classList.add('processing');
  button.innerHTML='<span>ОФОРМЛЯЕМ…</span>'+CHECK_SVG;
  try{
   if(connected){
    const response=await api('/api/orders','POST',d);
    orderState=VRPayment.nextState(orderState,'resolve-success');
    button.classList.remove('processing');button.classList.add('success');
    button.innerHTML='<span>'+(publicDemo?'ДЕМО-ЗАКАЗ ГОТОВ':'ЗАЯВКА ПРИНЯТА')+'</span>'+CHECK_SVG;
    report(publicDemo?`Демо-заказ ${response.order.code} оформлен визуально — НЕ сохранён. Никакой оплаты и доставки нет.`:`Заявка ${response.order.code} сохранена! Сумма ${M(response.order.total)}. Оплата не произведена. Мы не отправляем автоматические письма и не оформляем доставку в этой демоверсии.`);
    printReceipt(receiptSummary,publicDemo?null:response.order);
    window.VRStore.clearCart();
    if(me)await refreshOrders();
   }else{
    orderState=VRPayment.nextState(orderState,'resolve-success');
    button.classList.remove('processing');button.classList.add('success');
    button.innerHTML='<span>ДЕМО-ПРОСМОТР</span>'+CHECK_SVG;
    report(`DEMO / ${M(calc().total)}. Заявка НЕ отправлена. Для сохранения заказов запусти start_windows.bat или npm start и открой http://localhost:3000. Корзина сохранена.`);
    printReceipt(receiptSummary,null);
   }
  }catch(err){
   orderState=VRPayment.nextState(orderState,'resolve-error');
   button.classList.remove('processing');
   report(err.message);button.disabled=false;button.innerHTML='<span>ПОПРОБОВАТЬ ЕЩЁ ↗</span>';
  }
 });
 function status(m){$('account-message').textContent=m||''}
 function renderVisitor(){
  $('account-body').innerHTML=`<div class="auth-tabs"><button data-tab="login" class="${loginTab==='login'?'active':''}">ВОЙТИ</button><button data-tab="register" class="${loginTab==='register'?'active':''}">РЕГИСТРАЦИЯ</button></div><form id="auth-form" class="commerce-fields"><label class="${loginTab==='register'?'':'hidden'}">ИМЯ<input name="name" autocomplete="name" minlength="2" maxlength="80" ${loginTab==='register'?'required':''}></label><label>EMAIL<input type="email" name="email" autocomplete="email" required></label><label>ПАРОЛЬ <small>${loginTab==='register'?'От 10 символов':''}</small><input type="password" name="password" autocomplete="${loginTab==='login'?'current-password':'new-password'}" minlength="${loginTab==='register'?10:1}" required></label><button class="primary" type="submit">${loginTab==='register'?'СОЗДАТЬ АККАУНТ':'ВОЙТИ В ПРОФИЛЬ'} ↗</button></form><p class="auth-hint">${publicDemo?'Публичная демоверсия: авторизация отключена. Для проверки регистрации и админ-панели скачай проект и запусти локально.':''+(connected?'Аккаунт сохраняется в локальной SQLite-базе сервера. Не используй личные пароли для этой демонстрации.':'Регистрация и история заказов доступны при запуске через локальный Node.js-сервер. Открой start_windows.bat, затем http://localhost:3000.')}</p>`;
  $('auth-form').querySelector('button[type=submit]').disabled=!connected||publicDemo;
 }
 function renderProfile(){
  $('account-body').innerHTML=`<div class="profile-welcome"><div><small>MEMBER ACCESS / ${E(me.role.toUpperCase())}</small><h3>ПРИВЕТ, ${E(me.name.toUpperCase())}<span>↗</span></h3><p>${E(me.email)}</p></div><button id="logout" type="button">ВЫЙТИ ↗</button></div><div class="profile-grid"><section><div class="step-head">01 / МОИ ДАННЫЕ</div><form id="profile-form" class="commerce-fields"><label>Имя<input name="name" value="${E(me.name)}" maxlength="80" required></label><label>Адрес доставки<textarea name="address" maxlength="250" rows="3" placeholder="Адрес для следующих заявок">${E(me.addresses?.[0]||'')}</textarea></label><button class="profile-save" type="submit">СОХРАНИТЬ ДАННЫЕ ↗</button></form><div class="step-head">02 / ИЗБРАННОЕ</div><div class="profile-favorites" id="profile-favorites"></div></section><section><div class="step-head">03 / МОИ ЗАКАЗЫ</div><div id="profile-orders"></div></section></div>${me.role==='admin'?'<a class="primary profile-admin-link" href="/admin.html">ОТКРЫТЬ АДМИН-ПАНЕЛЬ ↗</a>':''}`;
  renderOrders();renderFavorites();
 }
 function renderOrders(){
  const t=$('profile-orders');if(!t)return;
  t.innerHTML=myOrders.length?myOrders.map(o=>`<div class="profile-order"><div><strong>${E(o.code)}</strong><small>${E(o.created_at)} · ${E(o.status)}</small></div><b>${M(o.total)}</b><small>Оплата не подключена</small></div>`).join(''):'<p class="empty-note">Пока нет заявок. Начни с каталога.</p>';
 }
 function renderFavorites(){
  const t=$('profile-favorites');if(!t)return;
  t.innerHTML=myFavorites.length?myFavorites.map(id=>PRODUCTS.find(p=>p.id===id)).filter(Boolean).map(p=>`<button type="button" data-profile-product="${E(p.id)}">${E(p.name)} <span>${M(p.price)} ↗</span></button>`).join(''):'<p class="empty-note">В избранном пока пусто — нажми ♡ на любой вещи.</p>';
 }
 async function refreshOrders(){if(!connected||!me)return;try{myOrders=(await api('/api/my-orders')).orders;renderOrders()}catch(err){status(err.message)}}
 async function refreshFavs(){if(!connected||!me)return;try{
  const remote=(await api('/api/favorites')).favorites;
  myFavorites=[...new Set([...remote,...window.VRStore.getFavorites()])];
  window.VRStore.setFavorites(myFavorites);
  await api('/api/favorites','PUT',{ids:myFavorites});renderFavorites();
 }catch(err){status(err.message)}}
 async function refreshMe(){if(!connected){me=null;renderVisitor();return}
  try{me=(await api('/api/me')).user;if(me){await Promise.all([refreshOrders(),refreshFavs()]);renderProfile()}else renderVisitor()}
  catch(err){status(err.message);me=null;renderVisitor()}
 }
 $('account-open').onclick=()=>{
  if(publicDemo){window.open(githubUrl,'_blank','noopener,noreferrer');return;}
  status('');(me?renderProfile():renderVisitor());$('account-dialog').showModal();
 };
 $('account-body').addEventListener('click',async e=>{
  const tab=e.target.closest('[data-tab]');if(tab){loginTab=tab.dataset.tab;renderVisitor();status('');return}
  if(e.target.closest('#logout')){
   try{await api('/api/logout','POST',{});me=null;myOrders=[];myFavorites=[];renderVisitor();status('Ты вышел из аккаунта.')}catch(err){status(err.message)}return;
  }
  const product=e.target.closest('[data-profile-product]');if(product){$('account-dialog').close();window.VRStore.showProduct(product.dataset.profileProduct)}
 });
 $('account-body').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.target,fd=new FormData(form);
  const btn=form.querySelector('button[type=submit]');if(btn)btn.disabled=true;
  try{
   if(form.id==='auth-form'){
    const payload={name:fd.get('name'),email:fd.get('email'),password:fd.get('password')};
    await api(loginTab==='login'?'/api/login':'/api/register','POST',payload);
    status('Добро пожаловать!');await refreshMe();
   }else if(form.id==='profile-form'){
    const addresses=String(fd.get('address')||'').trim();
    await api('/api/profile','PUT',{name:fd.get('name'),addresses:addresses?[addresses]:[]});
    me.name=String(fd.get('name')).trim();me.addresses=addresses?[addresses]:[];
    renderProfile();status('Профиль сохранён.');
   }
  }catch(err){status(err.message)}finally{if(btn&&btn.isConnected)btn.disabled=false}
 });
 document.addEventListener('vr:favorites-changed',async()=>{
  myFavorites=window.VRStore.getFavorites();renderFavorites();
  if(me&&connected)try{await api('/api/favorites','PUT',{ids:myFavorites})}catch(err){status(err.message)}
 });
 refreshMe();
})();
