/* JR Document Export v1 — one print/PDF workflow for verified, server-backed documents.
 * Uses native browser print (Save as PDF); does not generate or upload document data.
 */
(function(){
 'use strict';
 let active=null;
 function clear(){
  document.body.classList.remove('jr-receipt-print-mode');
  if(active)active.classList.remove('jr-receipt-print-target');
  active=null;
 }
 function exportDocument(element,mode){
  if(!(element instanceof HTMLElement))return false;
  if(active)clear();
  active=element;
  if(element.tagName==='DETAILS')element.open=true;
  element.classList.add('jr-receipt-print-target');
  document.body.classList.add('jr-receipt-print-mode');
  const originalTitle=document.title;
  const safeId=String(element.dataset.receiptId||'document').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,60);
  document.title='JR-'+safeId;
  const finish=()=>{clear();document.title=originalTitle;window.removeEventListener('afterprint',finish)};
  window.addEventListener('afterprint',finish,{once:true});
  try{window.print()}catch(_){finish();return false}
  // Some mobile browsers do not fire afterprint; clean up on the next focus.
  window.addEventListener('focus',()=>{if(active===element)finish()},{once:true});
  return true;
 }
 window.JRDocumentExport=Object.freeze({print:element=>exportDocument(element,'print'),savePdf:element=>exportDocument(element,'pdf')});
})();
