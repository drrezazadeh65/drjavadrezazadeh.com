// Governance consistency is independent of approval state; deployment requires a separate positive gate.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
export const REQUIRED_GATES=["accurate Persian wordmark","custom vector paths reviewed","monochrome","small-size legibility","contrast","print proof","bilingual review","trademark clearance","template snapshots"];
export function validateBrandStatus(status){
 const errors=[];
 if(!status||typeof status!=="object"||Array.isArray(status))return {ok:false,errors:["INVALID_STATUS"]};
 const missing=REQUIRED_GATES.filter(x=>!Array.isArray(status.approval_gates)||!status.approval_gates.includes(x));
 if(missing.length)errors.push("MISSING_GATES:"+missing.join(","));
 if(status.primary_script!=="fa")errors.push("NOT_PERSIAN_FIRST");
 if(status.legacy_jr_svg_status!=="deprecated_concept_only")errors.push("LEGACY_MARK_NOT_DEPRECATED");
 if(!["pending_vector_review","approved_vector"].includes(status.production_logo_status))errors.push("INVALID_LOGO_STATUS");
 if(typeof status.production_deploy_allowed!=="boolean")errors.push("INVALID_DEPLOY_FLAG");
 if(status.production_deploy_allowed===true&&status.production_logo_status!=="approved_vector")errors.push("UNAPPROVED_DEPLOY_FLAG");
 return {ok:errors.length===0,errors};
}
export function evaluateBrandRelease(status){
 const v=validateBrandStatus(status);
 return {allowed:v.ok&&status.production_logo_status==="approved_vector"&&status.production_deploy_allowed===true,reasons:v.errors.length?v.errors:["PRODUCTION_APPROVAL_REQUIRED"].filter(()=>!(status?.production_logo_status==="approved_vector"&&status?.production_deploy_allowed===true))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const status=JSON.parse(fs.readFileSync(path.join(root,"brand-status.json"),"utf8"));
 const result=process.argv.includes("--validate-status")?validateBrandStatus(status):evaluateBrandRelease(status);
 if(!result.ok&&!result.allowed){console.error(result.errors?.join("\n")||result.reasons?.join("\n"));process.exitCode=1;}
 else console.log(process.argv.includes("--validate-status")?"Brand governance consistency verified.":"Brand release policy eligible; independent human review still required.");
}
