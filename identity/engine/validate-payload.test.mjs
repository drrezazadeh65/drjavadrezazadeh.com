import test from "node:test";
import assert from "node:assert/strict";
import {validatePreviewPayload} from "./validate-payload.mjs";
import {renderDocumentPreview} from "./preview.mjs";
const base={type:"receipt",locale:"fa-IR",document_id:"DEMO-123",template_version:"1.0.0",recipient:"نمونه"};
test("valid bilingual preview payloads",()=>{
 for(const locale of ["fa-IR","en"])assert.equal(validatePreviewPayload({...base,locale}).ok,true);
});
test("reject control characters in identifying fields",()=>{
 for(const field of ["document_id","recipient","template_version"]){
  assert.equal(validatePreviewPayload({...base,[field]:"a\u0000b"}).ok,false);
  assert.throws(()=>renderDocumentPreview({...base,[field]:"a\u0000b"}));
 }
});
test("reject oversized and nontext description",()=>{
 for(const description of ["x".repeat(3001),{},12,"hello\u0001world"]){
  assert.equal(validatePreviewPayload({...base,description}).ok,false);
  assert.throws(()=>renderDocumentPreview({...base,description}));
 }
});
test("reject missing fields and prototype tampering",()=>{
 for(const input of [null,[],{}, {...base,document_id:" "},{...base,type:"payment_confirmation"}]){
  assert.equal(validatePreviewPayload(input).ok,false);
 }
});
