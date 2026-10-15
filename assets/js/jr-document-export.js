/* JR Document Export v3 — native print / Save as PDF, no external processing.
 * Caller must supply an authenticated, server-verified document.
 */
(function(){
 'use strict';
 let active=null;
 function clear(){
  if(!active)return;
  document.body.classList.remove('jr-receipt-print-mode');
  active.element.classList.remove('jr-receipt-print-target');
  if(active.wasClosed)active.element.open=false;
  if(active.element.dataset.jrExporting==='true')delete active.element.dataset.jrExporting;
  if(active.element.dataset.jrPrintTitle)delete active.element.dataset.jrPrintTitle;
  document.title=active.title;
  active=null;
 }
 window.addEventListener('afterprint',clear);
 function exportDocument(element){
  if(!(element instanceof HTMLElement)||!element.isConnected||!document.body.contains(element))return false;
  if(active)clear();
  const wasClosed=element.tagName==='DETAILS'&&!element.open;
  if(wasClosed)element.open=true;
  active={element,wasClosed,title:document.title};
  element.classList.add('jr-receipt-print-target');
  element.dataset.jrExporting='true';
  document.body.classList.add('jr-receipt-print-mode');
  const safeId=String(element.dataset.receiptId||'document').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60);
  document.title='JR-'+safeId;
  try{window.print();return true}catch(_){clear();return false}
 }
 window.JRDocumentExport=Object.freeze({
  print:exportDocument,
  savePdf:exportDocument,
  clear
 });
})();
