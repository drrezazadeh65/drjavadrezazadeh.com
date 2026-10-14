import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {validateProposedRegistry} from "./validate-registry.mjs";
const sql=fs.readFileSync(new URL("../migrations/PROPOSED-001-document-registry.sql",import.meta.url),"utf8");
test("Proposed canonical registry meets non-destructive baseline",()=>assert.deepEqual(validateProposedRegistry(sql),{ok:true,failures:[]}));
test("Reject destructive operations",()=>{for(const s of ["DROP TABLE users;","CREATE DATABASE another;","TRUNCATE TABLE users;","DELETE FROM users;"]){assert.equal(validateProposedRegistry(sql+"\n"+s).ok,false)}});
test("Reject absent idempotency uniqueness",()=>assert.equal(validateProposedRegistry(sql.replace("UNIQUE KEY uq_document_idempotency","KEY uq_document_idempotency")).ok,false));
test("Reject unsupported input",()=>assert.equal(validateProposedRegistry(null).ok,false));
