'use strict';
/* VNE RAMOK — progressive enhancement. No dependencies, no scroll hijacking.
   Hover-specific animation runs only for fine pointers and when motion is allowed. */
(()=>{
 const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
 const fine=window.matchMedia('(hover: hover) and (pointer: fine)');
 document.documentElement.classList.add('motion-ready');
 const reveals=document.querySelectorAll('.reveal');
 if(!('IntersectionObserver' in window)||reduce.matches){reveals.forEach(el=>el.classList.add('in-view'))}
 else{
  const observer=new IntersectionObserver((entries)=>entries.forEach(entry=>{
   if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target)}
  }),{threshold:.15,rootMargin:'0px 0px -35px 0px'});
  reveals.forEach(el=>observer.observe(el));
 }
 // Mouse movement is sampled once per animation frame. The previous code
 // measured layout and wrote CSS variables for EVERY native pointer event.
 // This matters on high-polling-rate gaming mice (500–1000+ events/second).
 function bindPointerMotion(el, update, reset) {
  let pending=0, clientX=0, clientY=0;
  el.addEventListener('pointermove', e => {
   if(reduce.matches||!fine.matches||document.hidden)return;
   clientX=e.clientX;clientY=e.clientY;
   if(pending)return;
   pending=requestAnimationFrame(()=>{
    pending=0;
    if(!el.isConnected||reduce.matches||document.hidden)return;
    const r=el.getBoundingClientRect();
    if(r.width&&r.height)update(clientX,clientY,r);
   });
  },{passive:true});
  el.addEventListener('pointerleave',()=>{
   if(pending){cancelAnimationFrame(pending);pending=0}
   reset();
  });
 }
 const liquid=document.querySelector('.liquid-brand');
 if(liquid)bindPointerMotion(liquid,(x,y,r)=>{
  liquid.style.setProperty('--light-x',((x-r.left)/r.width*100).toFixed(1)+'%');
  liquid.style.setProperty('--light-y',((y-r.top)/r.height*100).toFixed(1)+'%');
 },()=>{
  liquid.style.setProperty('--light-x','50%');liquid.style.setProperty('--light-y','50%');
 });
 document.querySelectorAll('.magnetic').forEach(el=>bindPointerMotion(el,(x,y,r)=>{
  el.style.setProperty('--mag-x',((x-r.left-r.width/2)*.10).toFixed(2)+'px');
  el.style.setProperty('--mag-y',((y-r.top-r.height/2)*.12).toFixed(2)+'px');
 },()=>{
  el.style.setProperty('--mag-x','0px');el.style.setProperty('--mag-y','0px');
 }));
 const stage=document.getElementById('pass-stage');
 const badge=stage?.querySelector('.drop-pass');
 if(stage&&badge)bindPointerMotion(stage,(mx,my,r)=>{
  const x=Math.max(0,Math.min(1,(mx-r.left)/r.width));
  const y=Math.max(0,Math.min(1,(my-r.top)/r.height));
  stage.style.setProperty('--spot-x',(x*100).toFixed(1)+'%');
  stage.style.setProperty('--spot-y',(y*100).toFixed(1)+'%');
  badge.style.setProperty('--card-ry',((x-.5)*-12).toFixed(2)+'deg');
  badge.style.setProperty('--card-rx',((y-.5)*10).toFixed(2)+'deg');
  badge.style.setProperty('--shine-x',(x*100).toFixed(1)+'%');
  badge.style.setProperty('--shine-y',(y*100).toFixed(1)+'%');
 },()=>{
  badge.style.setProperty('--card-ry','0deg');badge.style.setProperty('--card-rx','0deg');
  badge.style.setProperty('--shine-x','50%');badge.style.setProperty('--shine-y','35%');
  stage.style.setProperty('--spot-x','55%');stage.style.setProperty('--spot-y','42%');
 });
 // Apply light-catching material to plain interactive buttons (including catalog dialogs
 // rendered later by app.js). A scoped observer is only needed when dialog contents change.
 const glintSelector=[
  '.primary', '.controls button', '#sections-open', '#cart-open',
  '#orbit-open', '#favorites-filter', '.category-list button',
  'footer button', 'dialog .close', '.gallery-zoom', '.gallery-thumb',
  '.colors button', '.sizes button', '.qty button', '.remove', '.favorite',
  '.shuffle-card button', '.lb-hotspot', '.lb-carousel button', '.lb-view', '.lb-item', '.outfit-tab', '.outfit-reset', '.outfit-option', '.outfit-swatch'
 ].join(',');
 const ambientIds=new Map([['cart-open','-3s'],['orbit-open','-1s'],['favorites-filter','-5s'],['shuffle-pause','-2s'],['shuffle-prev','-3s'],['shuffle-next','-4s'],['sections-open','-2s'],['checkout-open','-3s']]);
 function decorateGlints(root){
  const targets=[];
  if(root.nodeType===1&&root.matches(glintSelector))targets.push(root);
  if(root.querySelectorAll)targets.push(...root.querySelectorAll(glintSelector));
  targets.forEach((el,index)=>{
   if(el.classList.contains('product-open')||el.classList.contains('orbit-tile'))return;
   el.classList.add('shine-button');
   // All primary CTAs, navigation and selector buttons catch light periodically.
   const ambient=el.closest('.hero-actions,.manifesto')!==null || ambientIds.has(el.id) || (el.classList.contains('primary') && el.closest('dialog[open]')!==null);
   if(ambient){
    el.classList.add('shine-ambient');
    el.style.setProperty('--shine-delay',ambientIds.get(el.id)||(-((index*1.15)%6.5)).toFixed(2)+'s');
   }
  });
 }
 decorateGlints(document);
 // 3D tilt on product cards: pointer-driven rotateX/rotateY on the card's
 // image via CSS vars, fine-pointer only, skipped under reduced motion.
 // catalog.js re-renders #product-grid on every filter/sort/search change,
 // so new cards are picked up by the same MutationObserver as the glints.
 function decorateTilt(root){
  const cards=[];
  if(root.nodeType===1&&root.matches('.product-card'))cards.push(root);
  if(root.querySelectorAll)cards.push(...root.querySelectorAll('.product-card'));
  cards.forEach(card=>{
   if(card.dataset.tiltReady)return;
   card.dataset.tiltReady='1';
   const visualEl=card.querySelector('.visual');
   if(!visualEl)return;
   bindPointerMotion(card,(x,y,r)=>{
    const rx=(x-r.left)/r.width,ry=(y-r.top)/r.height;
    visualEl.style.setProperty('--tilt-x',((ry-.5)*-7).toFixed(2)+'deg');
    visualEl.style.setProperty('--tilt-y',((rx-.5)*9).toFixed(2)+'deg');
   },()=>{
    visualEl.style.setProperty('--tilt-x','0deg');
    visualEl.style.setProperty('--tilt-y','0deg');
   });
  });
 }
 decorateTilt(document);
 if('MutationObserver' in window){
  const glintObserver=new MutationObserver(records=>{
   for(const record of records){
    for(const added of record.addedNodes){
     if(added.nodeType===1){decorateGlints(added);decorateTilt(added)}
    }
   }
  });
  // Child additions only; attributes and class additions are not observed.
  for(const container of ['product-grid','card-stack','category-list','product-detail','cart-items','checkout-summary','orbit','lookbook-stage','lb-item-list','outfit-tabs','outfit-choices','outfit-detail']){
   const root=document.getElementById(container);
   if(root)glintObserver.observe(root,{subtree:true,childList:true});
  }
 }
 // Animated cart-count only when its numeric content actually changes.
 const cartCount=document.getElementById('cart-count');
 if(cartCount&&'MutationObserver' in window){
  let previous=cartCount.textContent;
  new MutationObserver(()=>{
   const current=cartCount.textContent;if(current===previous)return;
   previous=current;if(reduce.matches)return;
   cartCount.classList.remove('is-popping');void cartCount.offsetWidth;
   cartCount.classList.add('is-popping');
  }).observe(cartCount,{childList:true,characterData:true,subtree:true});
  cartCount.addEventListener('animationend',()=>cartCount.classList.remove('is-popping'));
 }
 // Delegated ink ripple: works for newly-rendered collection products too.
 document.addEventListener('pointerdown',e=>{
  if(reduce.matches||!fine.matches)return;
  const target=e.target.closest('.category-list button, .controls button, .favorite');
  if(!target||target.disabled)return;
  const rect=target.getBoundingClientRect(),point=document.createElement('span');
  point.className='motion-ripple';
  point.style.setProperty('--ripple-x',e.clientX-rect.left+'px');
  point.style.setProperty('--ripple-y',e.clientY-rect.top+'px');
  // position context only for unpositioned controls
  if(getComputedStyle(target).position==='static')target.style.position='relative';
  target.appendChild(point);point.addEventListener('animationend',()=>point.remove(),{once:true});
 },{passive:true});
})();
