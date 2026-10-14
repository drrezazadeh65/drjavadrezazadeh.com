/** Pure validation of preview payloads; never authorizes official issuance. */
export const DOCUMENT_TYPES=Object.freeze(["receipt","invoice","certificate","talent_report","letterhead","assessment"]);
export const DOCUMENT_LOCALES=Object.freeze(["fa-IR","en"]);
const TEXT_LIMITS=Object.freeze({document_id:80,template_version:30,recipient:160,description:3000});
function validText(value,max){return typeof value==="string"&&value.trim().length>0&&value.length<=max&&!/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);}
export function validatePreviewPayload(input){
 if(!input||typeof input!=="object"||Array.isArray(input))return {ok:false,errors:["Invalid document payload"]};
 const errors=[];
 if(!DOCUMENT_TYPES.includes(input.type))errors.push("Invalid document type");
 if(!DOCUMENT_LOCALES.includes(input.locale))errors.push("Invalid locale");
 for(const field of ["document_id","template_version","recipient"]){
  if(!validText(input[field],TEXT_LIMITS[field]))errors.push("Invalid "+field);
 }
 if(input.description!==undefined&&(typeof input.description!=="string"||input.description.length>TEXT_LIMITS.description||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(input.description)))errors.push("Invalid description");
 return {ok:errors.length===0,errors};
}
