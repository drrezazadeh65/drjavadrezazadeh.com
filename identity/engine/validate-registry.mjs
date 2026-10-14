/** Static safeguards for proposed MariaDB registry; no database connection or migration execution. */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..","migrations");
export function validateProposedRegistry(sql){
 const failures=[];
 if(typeof sql!=="string")return {ok:false,failures:["INVALID_SQL"]};
 const must=[
  [/CREATE TABLE IF NOT EXISTS identity_document_registry/i,"MISSING_TABLE"],
  [/ENGINE\s*=\s*InnoDB/i,"NOT_INNODB"],
  [/UNIQUE KEY\s+uq_document_idempotency\s*\(idempotency_key\)/i,"MISSING_UNIQUE_IDEMPOTENCY"],
  [/UNIQUE KEY\s+uq_document_uuid\s*\(document_uuid\)/i,"MISSING_UNIQUE_UUID"],
  [/private_storage_reference/i,"MISSING_PRIVATE_REFERENCE"],
  [/content_sha256/i,"MISSING_CONTENT_HASH"]
 ];
 for(const [re,code] of must)if(!re.test(sql))failures.push(code);
 if(/\b(?:DROP\s+(?:TABLE|DATABASE)|TRUNCATE\s+TABLE|DELETE\s+FROM|CREATE\s+DATABASE|USE\s+\w+)\b/i.test(sql))failures.push("DESTRUCTIVE_OR_PARALLEL_DATABASE");
 return {ok:failures.length===0,failures};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const sql=fs.readFileSync(path.join(dir,"PROPOSED-001-document-registry.sql"),"utf8");
 const result=validateProposedRegistry(sql);
 if(!result.ok){console.error(result.failures.join("\n"));process.exitCode=1;}
 else console.log("Proposed registry static safeguards passed; migration NOT executed.");
}
