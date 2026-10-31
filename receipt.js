/* Restored MOTION 14: original animated receipt, adapted for actual saved demo orders.
 * This module generates safe receipt markup; no payment processing takes place. */
'use strict';
(function(root, factory){
 const api = factory();
 if(typeof module !== 'undefined' && module.exports) module.exports = api;
 else root.VRReceipt = api;
})(typeof window !== 'undefined' ? window : globalThis, function(){
 const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money = value => new Intl.NumberFormat('ru-RU').format(Number(value)||0) + ' ₽';
 function render({code,lines,subtotal,discount,shippingFee,total,saved,date}){
  const rows = (lines||[]).map(line=>`<div class="vr-receipt-row"><span>${esc(line.qty)} × ${esc(line.name)}<small>${esc(line.color)} / ${esc(line.size)}</small></span><b>${money(Number(line.price)*Number(line.qty))}</b></div>`).join('');
  const safeCode = esc(code || 'DEMO');
  const dt = date instanceof Date && !Number.isNaN(date.valueOf()) ? date : new Date();
  return `<div class="vr-receipt-heading"><div class="vr-receipt-brand">VNE RAMOK<span>®</span></div><p>OUTSIDE THE FRAME / INSIDE YOUR WORLD</p><div class="vr-receipt-demo">${saved?'ЗАЯВКА СОХРАНЕНА · НЕ ОПЛАЧЕНА':'ДЕМОНСТРАЦИЯ · НЕ СОХРАНЕНО'}</div></div>
  <div class="vr-receipt-meta"><span>${safeCode}</span><span>${esc(dt.toLocaleString('ru-RU'))}</span></div>
  <div class="vr-receipt-rule"></div>${rows}<div class="vr-receipt-rule"></div>
  <div class="vr-receipt-row"><span>СУММА ВЕЩЕЙ</span><b>${money(subtotal)}</b></div>
  <div class="vr-receipt-row"><span>СКИДКА</span><b>−${money(discount)}</b></div>
  <div class="vr-receipt-row"><span>ДОСТАВКА (DEMO)</span><b>${money(shippingFee)}</b></div>
  <div class="vr-receipt-total"><span>ИТОГО</span><strong>${money(total)}</strong></div>
  <div class="vr-receipt-barcode" aria-hidden="true"></div>
  <p class="vr-receipt-footnote">ПОРТФОЛИО-ПРОЕКТ. ЭТО НЕ ЧЕК ОБ ОПЛАТЕ.<br>ДЕНЬГИ НЕ СПИСАНЫ · ДОСТАВКА НЕ ОФОРМЛЕНА.</p>`;
 }
 return {render};
});
