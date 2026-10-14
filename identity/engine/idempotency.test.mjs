import test from "node:test";
import assert from "node:assert/strict";
import {issuanceIdempotencyKey as key} from "./idempotency.mjs";
const base={source_type:"commerce_order",source_id:"O-123",document_type:"receipt",template_version:"v1"};
test("Identical issuance tuple has stable idempotency key",()=>assert.equal(key(base),key({...base})));
test("Changing any identity field changes key",()=>{const a=key(base);for(const name of Object.keys(base))assert.notEqual(a,key({...base,[name]:base[name]+"2"}))});
test("Length-prefixed tuples avoid ambiguous separator collisions",()=>assert.notEqual(key({...base,source_type:"a:b",source_id:"c"}),key({...base,source_type:"a",source_id:"b:c"})));
test("Reject invalid or missing identity fields",()=>{for(const input of [undefined,{}, {...base,source_id:""}, {...base,source_id:"x y"},{...base,source_id:"x".repeat(161)}])assert.throws(()=>key(input))});
