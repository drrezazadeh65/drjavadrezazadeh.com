/* Browser-independent tests for native print / Save-as-PDF document isolation. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function fixture(){
  const events={};
  const classes=()=>{const values=new Set();return {add:x=>values.add(x),remove:x=>values.delete(x),contains:x=>values.has(x)}};
  class HTMLElement {}
  const element=new HTMLElement();
  element.isConnected=true;
  element.tagName='DETAILS';
  element.open=false;
  element.dataset={receiptId:'verified-123'};
  element.classList=classes();
  const body={classList:classes(),contains:x=>x===element};
  const document={body,title:'Original dashboard'};
  let calls=0;
  const window={addEventListener:(name,fn)=>events[name]=fn,print:()=>{calls++}};
  const ctx={HTMLElement,document,window};
  vm.runInNewContext(fs.readFileSync('assets/js/jr-document-export.js','utf8'),ctx);
  return {element,body,document,window,events,get calls(){return calls}};
}

{
 const x=fixture();
 assert.equal(x.window.JRDocumentExport.savePdf(x.element),true);
 assert.equal(x.calls,1);
 assert.equal(x.element.open,true);
 assert.equal(x.element.dataset.jrExporting,'true');
 assert.equal(x.body.classList.contains('jr-receipt-print-mode'),true);
 assert.equal(x.document.title,'JR-verified-123');
 x.events.afterprint();
 assert.equal(x.element.open,false);
 assert.equal(x.element.dataset.jrExporting,undefined);
 assert.equal(x.element.dataset.jrPrintTitle,undefined);
 assert.equal(x.body.classList.contains('jr-receipt-print-mode'),false);
 assert.equal(x.document.title,'Original dashboard');
}
{
 const x=fixture();
 x.element.isConnected=false;
 assert.equal(x.window.JRDocumentExport.print(x.element),false);
 assert.equal(x.calls,0);
}
{
 const x=fixture();
 x.window.print=()=>{throw Error('blocked')};
 assert.equal(x.window.JRDocumentExport.print(x.element),false);
 assert.equal(x.element.open,false);
 assert.equal(x.document.title,'Original dashboard');
 assert.equal(x.body.classList.contains('jr-receipt-print-mode'),false);
}
console.log('JR document export: 3 state and cleanup tests passed');
