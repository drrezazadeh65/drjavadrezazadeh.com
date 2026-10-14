import test from "node:test";
import assert from "node:assert/strict";
import {validateTrustedIssuanceContext as check} from "./trusted-context.mjs";
const valid={origin:"bertina-server",session:{server_authenticated:true,account_id:"A1"},authorization:{server_checked:true,allowed:true},source:{loaded_from_canonical_db:true,id:"O1",type:"commerce_order"},transaction:{atomic:true,unique_constraint_verified:true},audit:{persisted:true},storage:{private:true,webroot_excluded:true}};
test("Fully verified server context is structurally eligible",()=>assert.equal(check(valid).ok,true));
test("Browser-supplied or incomplete context fails closed",()=>{for(const x of [null,{}, {...valid,origin:"browser"},{...valid,session:{account_id:"A1"}},{...valid,authorization:{allowed:true}},{...valid,source:{id:"O1",type:"commerce_order"}},{...valid,transaction:{atomic:true}},{...valid,audit:{}},{...valid,storage:{private:true}}])assert.equal(check(x).ok,false)});
test("All missing transaction and storage fields fail closed",()=>{assert.equal(check({...valid,transaction:null}).ok,false);assert.equal(check({...valid,storage:null}).ok,false)});
