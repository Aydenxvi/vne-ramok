'use strict';
/* LOOKBOOK / OUTFIT STUDIO — visual editorial & demo styling tool.
   Compatible with the existing VNE RAMOK catalog and VRCart helpers. */
(()=>{
 const looks=[
  {name:'CONCRETE DAYS',issue:'LOOK 01 / 02',caption:'Город — твой подиум.',description:'Мягкая футболка, расслабленный деним. Не нужно ничего доказывать.',panel:0,image:'assets/lookbook-01.webp',items:[{id:'tee02',x:67,y:31,tag:'ВЕРХ'},{id:'denim01',x:56,y:69,tag:'НИЗ'}],top:'tee02',bottom:'denim01',accessory:null},
  {name:'OFF THE GRID',issue:'LOOK 02 / 02',caption:'Вне маршрута. Вне рамок.',description:'Фактура, объём и свободная посадка. Собери собственную версию образа.',panel:1,image:'assets/lookbook-02.webp',items:[{id:'jacket01',x:69,y:32,tag:'ВЕРХ'},{id:'denim02',x:57,y:69,tag:'НИЗ'}],top:'jacket01',bottom:'denim02',accessory:null}
 ];
 const pools={
  top:PRODUCTS.filter(p=>['tees','hoodies','jackets'].includes(p.category)),
  bottom:PRODUCTS.filter(p=>['jeans','pants'].includes(p.category)),
  accessory:PRODUCTS.filter(p=>p.category==='hats')
 };
 const slotNames={top:'Верх',bottom:'Низ',accessory:'Аксессуар'};
 const id=id=>document.getElementById(id);
 const escText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 let lookIndex=0,spotIndex=null,activeSlot='top';
 let chosen={top:'tee02',bottom:'denim01',accessory:null};
 let colors={};let sizes={};
 let visual3D=null;let pendingVisual=null;let previewObserver=null;let previewUnavailable=false;
 let previewReady=false;
 const statusNode=id('outfit-3d-status'),stateNode=id('outfit-3d-state'),retryButton=id('outfit-3d-try');
 const diagButton=id('outfit-3d-diagnostics'),diagDetails=id('outfit-3d-details');
 // Keep the badge outside the overflow-hidden studio, so scrolling never clips it.
 if(document.body?.append)document.body.append(statusNode);
 function diagnosticText(){
   const stage=id('outfit-canvas');
   const msg=window.VROutfit3D?.lastError||'нет ошибок движка';
   const current=window.VROutfit3D?.mount?'3D-модуль загружен':'3D-модуль НЕ загружен';
   return `VNE 23 / ${current}\nСостояние: ${stateNode?.textContent||'неизвестно'}\nWebGL: ${String(msg)}\nCanvas: ${stage?.querySelector('canvas')?'есть':'нет'}\nЕсли ошибка содержит GLSL / shader / ERROR: 0:, это проблема кода; пришли этот текст. При недоступном контексте WebGL проверь аппаратное ускорение браузера.`;
 }
 diagButton?.addEventListener('click',()=>{diagDetails.hidden=!diagDetails.hidden;if(!diagDetails.hidden)diagDetails.textContent=diagnosticText()});
 function show3DStatus(mode,label,reason=''){
   if(!statusNode?.dataset)return;
   statusNode.dataset.mode=mode;
   stateNode.textContent=label;
   statusNode.title=reason;
   retryButton.hidden=mode==='ready'||mode==='loading';
   if(diagDetails&&!diagDetails.hidden)diagDetails.textContent=diagnosticText();
 }
 function mount3DPreview(force=false){
   if(visual3D||!pendingVisual)return;
   if(previewUnavailable&&!force)return;
   if(previewObserver){previewObserver.disconnect();previewObserver=null;}
   if(!window.VROutfit3D){
     previewUnavailable=true;
     show3DStatus('error','3D-ФАЙЛ НЕ ЗАГРУЖЕН','Проверь, что outfit-3d.js лежит рядом с index.html, а проект открыт из папки VNE RAMOK 21.');
     return;
   }
   previewUnavailable=false;
   previewReady=false;
   show3DStatus('loading','ЗАГРУЗКА 3D…');
   const stage=id('outfit-canvas');
   visual3D=window.VROutfit3D.mount(stage);
   if(visual3D){
     show3DStatus('loading','ОТРИСОВКА 3D…');
     try{visual3D.update(pendingVisual)}catch(err){
       window.VROutfit3D.lastError=String(err?.message||err);
       visual3D.destroy();visual3D=null;
       stage.classList.remove('outfit-3d-active');
       stage.innerHTML=outfitSvg();
     }
   }
   if(!visual3D){
     previewUnavailable=true;
     const detail=String(window.VROutfit3D.lastError||'WebGL недоступен');
     const short=/ERROR:\s*\d+:|shader|compile|overload|syntax/i.test(detail)?'ОШИБКА 3D-ШЕЙДЕРА':/WebGL|context|blocked|disabled|GPU/i.test(detail)?'WEBGL НЕДОСТУПЕН':'3D НЕ ЗАПУСТИЛСЯ';
     show3DStatus('error',short,detail+(short==='ОШИБКА 3D-ШЕЙДЕРА'?' — Это ошибка кода шейдера, а не видеокарты.':' — Проверь аппаратное ускорение в настройках браузера.'));
   }
 }
 function update3DPreview(){
   if(visual3D||previewUnavailable||!pendingVisual||previewObserver)return;
   if(!window.VROutfit3D){
     previewUnavailable=true;
     show3DStatus('error','3D-ФАЙЛ НЕ ЗАГРУЖЕН','Файл outfit-3d.js не найден или заблокирован.');
     return;
   }
   if('IntersectionObserver' in window){
     previewObserver=new IntersectionObserver(entries=>{
       if(entries.some(entry=>entry.isIntersecting)){
         previewObserver.disconnect();previewObserver=null;mount3DPreview();
       }
     },{rootMargin:'350px 0px',threshold:0});
     previewObserver.observe(id('outfit-canvas'));
   }else mount3DPreview();
 }
 // A tall studio section can enter the viewport while its top badge is off-screen.
 // Keep a small state indicator pinned to the window while this section is visible.
 const outfitSection=id('outfit');
 let visibilityQueued=false;
 function checkStudioViewport(){
   visibilityQueued=false;
   if(typeof outfitSection?.getBoundingClientRect!=='function'||!document.body)return;
   const rect=outfitSection.getBoundingClientRect();
   const showing=rect.top<window.innerHeight-70&&rect.bottom>95;
   document.body.classList.toggle('vr-outfit-visible',showing);
   if(showing&&pendingVisual&&!visual3D&&!previewUnavailable)mount3DPreview();
 }
 function scheduleViewportCheck(){if(visibilityQueued||typeof requestAnimationFrame!=='function')return;visibilityQueued=true;requestAnimationFrame(checkStudioViewport)}
 window.addEventListener?.('scroll',scheduleViewportCheck,{passive:true});
 window.addEventListener?.('resize',scheduleViewportCheck,{passive:true});
 document.addEventListener?.('visibilitychange',scheduleViewportCheck);
 scheduleViewportCheck();
 outfitSection.addEventListener('vr:outfit-3d-error',e=>{
   const failedViewer=visual3D;visual3D=null;previewReady=false;previewUnavailable=true;
   try{failedViewer?.destroy?.()}catch{}
   window.VROutfit3D.lastError=e.detail?.error||'Контекст WebGL потерян';
   id('outfit-canvas').innerHTML=outfitSvg();
   show3DStatus('error','3D ОТКЛЮЧИЛСЯ',window.VROutfit3D.lastError);
 });
 document.addEventListener?.('vr:outfit-3d-ready',update3DPreview);
 document.addEventListener?.('vr:outfit-3d-frame',()=>{
   if(!previewReady){previewReady=true;
     if(window.VROutfit3D?.isFallback)show3DStatus('fallback','3D НЕ ЗАПУСТИЛСЯ · УПРОЩЁННАЯ 3D',String(window.VROutfit3D.lastError||'Неизвестная ошибка GLB'));
     else show3DStatus('ready','3D МОДЕЛЬ / 360°');
   }
 });
 retryButton?.addEventListener('click',()=>{
   if(visual3D){
     if(window.VROutfit3D?.isFallback){try{visual3D.destroy()}catch{}visual3D=null;id('outfit-canvas').innerHTML=outfitSvg()}
     else{show3DStatus('ready','3D МОДЕЛЬ / 360°');return}
   }
   previewUnavailable=false;
   mount3DPreview(true);
 });
 const safeRead=()=>{try{return JSON.parse(localStorage.getItem('vr-outfit'))}catch{return null}};
 const prev=safeRead();
 if(prev&&typeof prev==='object'){
  for(const slot of Object.keys(pools)){
   if(prev.chosen?.[slot]===null&&slot==='accessory')chosen[slot]=null;
   else if(pools[slot].some(p=>p.id===prev.chosen?.[slot]))chosen[slot]=prev.chosen[slot];
  }
  if(prev.colors&&typeof prev.colors==='object')colors=prev.colors;
  if(prev.sizes&&typeof prev.sizes==='object')sizes=prev.sizes;
 }
 const product=id=>PRODUCTS.find(p=>p.id===id);
 const colorInfo=p=>{
  const variants=VRCart.colorsOf(p);
  return variants.find(c=>c.name===colors[p.id])||variants[0];
 };
 const save=()=>{try{localStorage.setItem('vr-outfit',JSON.stringify({chosen,colors,sizes}))}catch{}};
 // The editorial photos are moodboard images; lookbook recommendations are not exact photographed SKUs.
 function renderLookbook(){
  const look=looks[lookIndex];
  const gallery=id('lookbook-stage');
  gallery.classList.remove('lb-switch');void gallery.offsetWidth;gallery.classList.add('lb-switch');
  gallery.innerHTML=`<div class="lb-model"><img src="${look.image}" alt="${escText(lookIndex===0?'Модель в тёмной футболке и широких джинсах':'Модель в светлой куртке и широких графитовых джинсах')}" loading="lazy"></div>
    <span class="lb-photo-label">VNE / RAMOK · EDITORIAL</span>
    ${look.items.map((item,i)=>`<button class="lb-hotspot ${spotIndex===i?'is-active':''}" type="button" data-hotspot="${i}" style="--hx:${item.x}%;--hy:${item.y}%" aria-label="${escText(item.tag)}: показать похожую модель ${escText(product(item.id).name)}" aria-pressed="${spotIndex===i}"><span></span></button>`).join('')}
    ${spotIndex!==null?(()=>{const item=look.items[spotIndex],p=product(item.id);return `<div class="lb-popover" role="status"><div class="lb-popover__label">ПОХОЖАЯ МОДЕЛЬ / ${item.tag}</div><strong>${escText(p.name)}</strong><span>${money(p.price)}</span><button type="button" class="lb-view" data-look-product="${p.id}">Смотреть вещь ↗</button></div>`})():`<div class="lb-instruction">НАЖМИ НА ТОЧКИ <span>✳</span></div>`}`;
  id('lb-issue').textContent=look.issue;
  id('lb-title').textContent=look.name;
  id('lb-caption').textContent=look.caption;
  id('lb-description').textContent=look.description;
  id('lb-count').textContent=`0${lookIndex+1} / 0${looks.length}`;
  id('lb-item-list').innerHTML=look.items.map((it,i)=>{const p=product(it.id);return `<button type="button" data-look-select="${i}" class="lb-item ${spotIndex===i?'selected':''}"><span class="lb-item__index">0${i+1}</span><span><small>${it.tag}</small><strong>${escText(p.name)}</strong></span><span>${money(p.price)}</span><span>↗</span></button>`}).join('');
  id('lb-dots').innerHTML=looks.map((l,i)=>`<button type="button" data-look-index="${i}" aria-label="Открыть образ ${i+1}" aria-current="${i===lookIndex}"></button>`).join('');
 }
 function lookChange(delta){lookIndex=(lookIndex+delta+looks.length)%looks.length;spotIndex=null;renderLookbook()}
 id('lb-prev').addEventListener('click',()=>lookChange(-1));
 id('lb-next').addEventListener('click',()=>lookChange(1));
 id('lb-dots').addEventListener('click',e=>{const b=e.target.closest('[data-look-index]');if(!b)return;lookIndex=Number(b.dataset.lookIndex);spotIndex=null;renderLookbook()});
 id('lookbook-stage').addEventListener('click',e=>{
  const hotspot=e.target.closest('[data-hotspot]');const view=e.target.closest('[data-look-product]');
  if(hotspot){const n=Number(hotspot.dataset.hotspot);spotIndex=spotIndex===n?null:n;renderLookbook();id('lookbook-stage').querySelector(`[data-hotspot="${n}"]`)?.focus()}
  if(view){showProduct(view.dataset.lookProduct)}
 });
 id('lb-item-list').addEventListener('click',e=>{const b=e.target.closest('[data-look-select]');if(b){spotIndex=Number(b.dataset.lookSelect);renderLookbook();id('lookbook-stage').querySelector(`[data-hotspot="${spotIndex}"]`)?.focus()}});
 id('lb-style-it').addEventListener('click',()=>{
  const l=looks[lookIndex];chosen={top:l.top,bottom:l.bottom,accessory:l.accessory};activeSlot='top';sizes={};colors={};save();renderBuilder();id('outfit').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});toast('Образ загружен в конструктор');
 });
 // Build silhouettes entirely from inline vectors: these are illustrative shapes, never product photos.
 function outfitSvg(){
  const top=product(chosen.top),bottom=product(chosen.bottom),hat=product(chosen.accessory);
  const tc=colorInfo(top).hex,bc=colorInfo(bottom).hex,hc=hat?colorInfo(hat).hex:'#282b29';
  const standard=`stroke="#252722" stroke-width="2.1" stroke-linejoin="round"`;
  const topMarkup=top.category==='hoodies'?`<path d="M124 151 Q130 137 150 138 Q170 152 190 138 Q212 139 220 151 L250 183 260 277 239 285 215 217 215 310 125 310 125 217 101 285 80 277 90 183Z" fill="${tc}" ${standard}/><path d="M150 138 Q137 119 154 118 Q168 126 170 153 Q173 126 186 118 Q203 122 190 138" fill="${tc}" ${standard}/><path d="M170 155V310 M141 269H198L191 291H149Z" stroke="#d4d4cc" stroke-width="3" fill="none"/><path d="M164 187V220" stroke="#121412" stroke-dasharray="2 7" stroke-width="3"/>`:
  top.category==='jackets'?`<path d="M126 148L145 133 170 151 195 133 214 148 245 170 266 263 243 275 218 219 215 291 125 291 122 219 97 275 74 263 95 170Z" fill="${tc}" ${standard}/><path d="M145 134L155 165 170 151 185 165 195 134 M170 151V290" fill="none" stroke="#eee8dc" stroke-width="3.5"/><rect x="135" y="233" width="24" height="10" rx="2" fill="#20231f" opacity=".42"/><rect x="181" y="233" width="24" height="10" rx="2" fill="#20231f" opacity=".42"/>`:
  `<path d="M129 146 Q148 137 154 137 Q170 154 186 137 Q204 139 213 146 L260 178 244 217 217 203 218 309 122 309 123 203 96 217 80 178Z" fill="${tc}" ${standard}/><path d="M152 138 Q170 160 188 138" fill="none" stroke="#dddcd2" stroke-width="4"/><path d="M129 296H211" stroke="#2225" stroke-width="2"/>`;
  const legs=bottom.category==='pants'?`<path d="M126 282 Q168 291 213 282 L235 500 197 506 176 352 158 352 142 506 103 500Z" fill="${bc}" ${standard}/><path d="M108 376L145 375 145 422 111 419Z M195 375L231 376 231 420 196 422Z" fill="${bc}" stroke="#2d2f2b" stroke-width="2.5"/><path d="M115 393H140M200 393H225" stroke="#f2ecdd" opacity=".52" stroke-width="2"/>`:
  `<path d="M124 280 Q170 291 217 280 L245 506 197 511 173 366 164 366 140 511 93 506Z" fill="${bc}" ${standard}/><path d="M170 286V364 M114 322Q134 353 158 320 M226 322Q209 353 187 320 M104 488L138 493 M201 493L236 487" fill="none" stroke="#f0ebe2" opacity=".52" stroke-width="2.6"/><path d="M124 300H217" stroke="#2b302c" stroke-width="5"/>`;
  const beanie=hat?`<path d="M133 77 Q133 18 170 18 Q207 18 207 77Z" fill="${hc}" ${standard}/><rect x="129" y="69" width="82" height="25" rx="4" fill="${hc}" ${standard}/><path d="M140 75V87M153 75V87M166 75V87M179 75V87M192 75V87M203 75V87" stroke="#eeeeea" opacity=".38" stroke-width="2"/>`:'';
  return `<svg class="outfit-figure" viewBox="0 0 340 550" role="img" aria-label="Эскиз комплекта: ${escText(top.name)}, ${escText(bottom.name)}${hat?', '+escText(hat.name):''}">
   <defs><filter id="wardrobe-shadow" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-opacity=".10"/></filter></defs>
   <ellipse cx="170" cy="531" rx="105" ry="9" fill="#262923" opacity=".13"/>
   <g fill="#ac9d89" stroke="#39352e" stroke-width="2"><path d="M134 92L135 130Q123 140 107 157L106 286 146 310 147 411 130 506 160 511 172 342 184 511 216 507 194 310 233 286 233 157Q217 138 204 132L205 92Z"/><rect x="153" y="112" width="34" height="46" rx="10"/></g>
   <path d="M138 73 Q134 34 170 30 Q205 34 202 73 L201 91 Q196 125 170 127 Q144 125 139 91Z" fill="#b8a692" stroke="#302d27" stroke-width="2"/>
   <path d="M136 82Q130 50 146 36Q174 18 196 39Q207 52 204 82L194 54Q169 67 147 53Z" fill="#242724"/>
   <path d="M153 86h11 M177 86h11" stroke="#6a6259" stroke-width="2" stroke-linecap="round"/><path d="M165 103Q170 107 177 103" stroke="#85786c" fill="none" stroke-width="1.5"/>
   <g filter="url(#wardrobe-shadow)" class="outfit-legs-layer">${legs}</g>
   <path d="M131 499L157 503 161 521Q141 529 110 523L103 519Z M185 503L209 499 238 519Q217 529 185 521Z" fill="#f2f1eb" stroke="#363a38" stroke-width="2"/>
   <g filter="url(#wardrobe-shadow)" class="outfit-top-layer">${topMarkup}</g>
   ${beanie?`<g class="outfit-hat-layer">${beanie}</g>`:''}
   </svg>`;
 }
 function renderBuilder(){
  const selected=[chosen.top,chosen.bottom,chosen.accessory].filter(Boolean).map(product);
  const total=selected.reduce((sum,p)=>sum+p.price,0);
  const stage=id('outfit-canvas');
  const top=product(chosen.top),bottom=product(chosen.bottom),hat=product(chosen.accessory);
  pendingVisual={top:top.category,bottom:bottom.category,hat:Boolean(hat),tc:colorInfo(top).hex,bc:colorInfo(bottom).hex,hc:hat?colorInfo(hat).hex:null,topName:top.name,bottomName:bottom.name,hatName:hat?.name};
  if(!visual3D){stage.innerHTML=outfitSvg();update3DPreview()}
  else visual3D.update(pendingVisual);
  stage.classList.remove('outfit-refresh');void stage.offsetWidth;stage.classList.add('outfit-refresh');
  id('outfit-total').textContent=money(total);
  id('outfit-count').textContent=`${selected.length} ${selected.length===2?'вещи':'вещи'}`;
  id('outfit-pieces').innerHTML=selected.map((p,i)=>`<div class="outfit-piece"><span>0${i+1}</span><span>${escText(p.name)}<small>${escText(colorInfo(p).name)}</small></span><strong>${money(p.price)}</strong></div>`).join('');
  id('outfit-tabs').innerHTML=Object.keys(pools).map((slot,i)=>`<button type="button" data-builder-tab="${slot}" class="outfit-tab" aria-pressed="${activeSlot===slot}"><span>0${i+1}</span>${slotNames[slot]}${chosen[slot]?' <i>●</i>':''}</button>`).join('');
  id('outfit-choice-title').textContent=`ВЫБЕРИ ${slotNames[activeSlot].toUpperCase()}`;
  const list=activeSlot==='accessory'?[null,...pools[activeSlot]]:pools[activeSlot];
  id('outfit-choices').innerHTML=list.map(p=>p?`<button type="button" data-builder-item="${p.id}" class="outfit-option ${chosen[activeSlot]===p.id?'selected':''}" aria-pressed="${chosen[activeSlot]===p.id}">${visual(p)}<span class="outfit-option__info"><strong>${escText(p.name)}</strong><small>${money(p.price)}</small></span><span class="outfit-option__select">${chosen[activeSlot]===p.id?'✓':'↗'}</span></button>`:`<button type="button" data-builder-item="none" class="outfit-option outfit-option--none ${chosen.accessory===null?'selected':''}" aria-pressed="${chosen.accessory===null}"><span class="no-hat">—</span><span class="outfit-option__info"><strong>БЕЗ АКСЕССУАРА</strong><small>Минимализм</small></span><span class="outfit-option__select">${chosen.accessory===null?'✓':'↗'}</span></button>`).join('');
  const current=product(chosen[activeSlot]);
  id('outfit-detail').innerHTML=current?`<div class="outfit-detail__name">${escText(current.name)} <span>${money(current.price)}</span></div>
   <span class="outfit-form-label">ЦВЕТ / ДЕМО-ПАЛИТРА</span>
   <div class="outfit-swatches" role="group" aria-label="Цвет ${escText(current.name)}">${VRCart.colorsOf(current).map(c=>`<button type="button" data-outfit-color="${escText(c.name)}" class="outfit-swatch" aria-pressed="${colorInfo(current).name===c.name}" aria-label="${escText(c.name)}" title="${escText(c.name)}"><span style="background:${escText(c.hex)}"></span></button>`).join('')}<span class="outfit-color-name">${escText(colorInfo(current).name)}</span></div>
   <label class="outfit-form-label" for="outfit-size">РАЗМЕР</label>
   <select id="outfit-size" aria-label="Размер ${escText(current.name)}"><option value="">Выбери размер…</option>${current.sizes.map(s=>`<option value="${escText(s)}" ${sizes[current.id]===s?'selected':''}>${escText(s)}</option>`).join('')}</select>`:`<p class="outfit-no-detail">Без аксессуара — тоже образ.</p>`;
  const missing=selected.filter(p=>!p.sizes.includes(sizes[p.id]));
  id('outfit-status').textContent=missing.length?`Перед добавлением выбери ${missing.length===1?'размер для одной вещи':'размеры для '+missing.length+' вещей'}.`:'Размеры выбраны — комплект готов к добавлению.';
  save();
 }
 id('outfit-tabs').addEventListener('click',e=>{const btn=e.target.closest('[data-builder-tab]');if(!btn)return;activeSlot=btn.dataset.builderTab;renderBuilder()});
 id('outfit-choices').addEventListener('click',e=>{const btn=e.target.closest('[data-builder-item]');if(!btn)return;const val=btn.dataset.builderItem;chosen[activeSlot]=val==='none'?null:val;renderBuilder();id('outfit-choices').querySelector(`[data-builder-item="${val}"]`)?.focus()});
 id('outfit-detail').addEventListener('click',e=>{const btn=e.target.closest('[data-outfit-color]');if(!btn)return;const p=product(chosen[activeSlot]);colors[p.id]=btn.dataset.outfitColor;renderBuilder();id('outfit-detail').querySelector(`[data-outfit-color="${CSS.escape(btn.dataset.outfitColor)}"]`)?.focus()});
 id('outfit-detail').addEventListener('change',e=>{if(e.target.id!=='outfit-size')return;const p=product(chosen[activeSlot]);sizes[p.id]=e.target.value;renderBuilder();id('outfit-size')?.focus()});
 id('outfit-add').addEventListener('click',()=>{
  const selected=[chosen.top,chosen.bottom,chosen.accessory].filter(Boolean).map(product);
  const unavailable=selected.find(p=>p.stock===0);if(unavailable){toast('Нет в наличии: '+unavailable.name);return}
  const unSized=selected.filter(p=>!p.sizes.includes(sizes[p.id]));
  if(unSized.length){const first=unSized[0];activeSlot=Object.keys(chosen).find(slot=>chosen[slot]===first.id);renderBuilder();id('outfit-size')?.focus();toast('Сначала выбери размер: '+first.name);return}
  const capped=selected.some(p=>cart.some(line=>line.id===p.id&&line.size===sizes[p.id]&&line.color===colorInfo(p).name&&line.qty>=99));
  if(capped){toast('В сумке уже максимум по одной из позиций');return}
  selected.forEach(p=>VRCart.addToCart(cart,p.id,colorInfo(p).name,sizes[p.id]));
  count();toast(`Комплект добавлен: ${selected.length} вещи`);
  const btn=id('outfit-add');btn.classList.remove('outfit-added');void btn.offsetWidth;btn.classList.add('outfit-added');
 });
 id('outfit-reset').addEventListener('click',()=>{chosen={top:pools.top[0]?.id||null,bottom:pools.bottom[0]?.id||null,accessory:null};sizes={};colors={};activeSlot='top';renderBuilder();toast('Образ сброшен')});
 // Keep editorial demo functional if the admin hides / replaces original SKUs.
 if(!pools.top.length||!pools.bottom.length){
  id('outfit-canvas').textContent='Добавьте в каталоге хотя бы один верх и один низ, чтобы собрать образ.';
  id('outfit-add').disabled=true;id('outfit-status').textContent='Недостаточно товаров в коллекции.';
  id('lookbook-stage').textContent='Съёмка скоро появится.';
  id('lb-item-list').textContent='Нет доступных моделей для образа.';
 }else{
  chosen.top=product(chosen.top)?chosen.top:pools.top[0].id;
  chosen.bottom=product(chosen.bottom)?chosen.bottom:pools.bottom[0].id;
  if(chosen.accessory&&!product(chosen.accessory))chosen.accessory=null;
  for(const look of looks){
   look.top=product(look.top)?look.top:pools.top[0].id;
   look.bottom=product(look.bottom)?look.bottom:pools.bottom[0].id;
   look.items.forEach(it=>{if(!product(it.id))it.id=it.tag==='ВЕРХ'?look.top:look.bottom});
  }
  renderLookbook();renderBuilder();
 }
})();
