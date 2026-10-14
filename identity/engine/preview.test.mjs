import test from "node:test";
import assert from "node:assert/strict";
import {renderDocumentPreview} from "./preview.mjs";
const base={type:"talent_report",locale:"fa-IR",document_id:"DEMO-1",template_version:"1.0",recipient:"نمونه",description:"تفسیر آزمایشی"};
test("Persian RTL document renders",()=>{const out=renderDocumentPreview(base);assert.match(out,/lang="fa" dir="rtl"/);assert.match(out,/دکتر جواد رضازاده یزدلی/);assert.match(out,/فاقد اعتبار رسمی/);});
test("English LTR document renders",()=>{const out=renderDocumentPreview({...base,locale:"en",type:"invoice"});assert.match(out,/lang="en" dir="ltr"/);assert.match(out,/Invoice/);});
test("HTML injection is escaped",()=>{const out=renderDocumentPreview({...base,recipient:'<img src=x onerror="alert(1)">'});assert.doesNotMatch(out,/<img src=x/);assert.match(out,/&lt;img/);});
test("Reject unknown document type",()=>assert.throws(()=>renderDocumentPreview({...base,type:"admin"})));
test("Reject missing identity",()=>assert.throws(()=>renderDocumentPreview({...base,document_id:""})));
test("Reject invalid locale",()=>assert.throws(()=>renderDocumentPreview({...base,locale:"xx"})));

test("All supported document types render in both languages",()=>{
 for(const type of ["receipt","invoice","certificate","talent_report","letterhead","assessment"]){
  for(const locale of ["fa-IR","en"]){
   const html=renderDocumentPreview({...base,type,locale});
   assert.match(html,/<html lang=/);
   assert.match(html,/PREVIEW ONLY|فاقد اعتبار رسمی/);
  }
 }
});
test("Description is escaped including script and markup",()=>{
 const html=renderDocumentPreview({...base,description:'<script>alert("x")</script>&'});
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/&amp;/);
});
test("Reject excessively long recipient and missing template version",()=>{
 assert.throws(()=>renderDocumentPreview({...base,recipient:"x".repeat(161)}));
 assert.throws(()=>renderDocumentPreview({...base,template_version:""}));
});
test("Reject arrays and unsupported document locale",()=>{
 assert.throws(()=>renderDocumentPreview([]));
 assert.throws(()=>renderDocumentPreview({...base,locale:"fa"}));
});

test("Reject non-text description",()=>{assert.throws(()=>renderDocumentPreview({...base,description:{unsafe:"value"}}));});

test("Every bilingual preview carries visible, print-persistent non-issuance watermark",()=>{
 for(const type of ["receipt","invoice","certificate","talent_report","letterhead","assessment"]){
  for(const locale of ["fa-IR","en"]){
   const html=renderDocumentPreview({...base,type,locale});
   assert.match(html,/<div class="preview-watermark" aria-hidden="true"><span>/);
   assert.match(html,/position:fixed/);
   assert.match(html,/pointer-events:none/);
   assert.match(html,locale==="fa-IR"?/پیش‌نمایش آزمایشی ـ فاقد اعتبار رسمی/:/PREVIEW ONLY — NOT AN ISSUED DOCUMENT/);
  }
 }
});
