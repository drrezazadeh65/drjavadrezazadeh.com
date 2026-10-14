import {validatePreviewPayload} from "./validate-payload.mjs";
/** JR Identity OS preview renderer. NOT an issuance, signing, or payment-verification service. */
const TYPES = Object.freeze({receipt:{fa:"رسید پرداخت",en:"Payment receipt"},invoice:{fa:"صورتحساب",en:"Invoice"},certificate:{fa:"گواهی",en:"Certificate"},talent_report:{fa:"گزارش تفسیری استعداد",en:"Talent interpretation report"},letterhead:{fa:"نامه رسمی",en:"Official letter"},assessment:{fa:"فرم ارزیابی",en:"Assessment form"}});
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clean = (v,max=160) => {if(typeof v!=="string" || !v.trim() || v.length>max) throw new TypeError("Invalid text field");return v.trim()};
export function renderDocumentPreview(input){
 const validation=validatePreviewPayload(input);
 if(!validation.ok) throw new TypeError(validation.errors.join("; "));
 const type=clean(input.type,40); if(!Object.hasOwn(TYPES,type)) throw new TypeError("Unsupported type");
 const locale=input.locale; if(!["fa-IR","en"].includes(locale)) throw new TypeError("Unsupported locale");
 const fa=locale==="fa-IR",lang=fa?"fa":"en",dir=fa?"rtl":"ltr";
 const id=clean(input.document_id,80),version=clean(input.template_version,30);
 const recipient=clean(input.recipient,160);
 const title=TYPES[type][lang];
 if(input.description!==undefined && typeof input.description!=="string") throw new TypeError("Invalid description");
 const body=typeof input.description==="string" ? input.description : "";
 const watermark=fa?"پیش‌نمایش آزمایشی ـ فاقد اعتبار رسمی":"PREVIEW ONLY — NOT AN ISSUED DOCUMENT";
 const brand=fa?"دکتر جواد رضازاده یزدلی":"Dr. Javad Rezazadeh Yazdeli";
 const note=fa?"این پیش‌نمایش سند صادرشده یا تأیید پرداخت نیست.":"This preview is not an issued document or proof of payment.";
 return `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — ${esc(id)}</title><style>body{margin:0;background:#eee;color:#17130d;font-family:${fa?"Tahoma, sans-serif":"Georgia, serif"}}main{box-sizing:border-box;background:#fff;max-width:210mm;min-height:297mm;margin:16px auto;padding:20mm}header,footer{border-block-end:1px solid #b5a88b;padding-block:12px}footer{border-block-end:0;border-block-start:1px solid #b5a88b;margin-block-start:48px}h1{font-size:28px}small{color:#655c50}.preview-watermark{position:fixed;inset:0;display:grid;place-items:center;pointer-events:none;z-index:10;font-size:clamp(20px,4vw,46px);font-weight:700;transform:rotate(-24deg);color:rgba(130,50,25,.17);text-align:center;letter-spacing:.04em}.preview-watermark span{border:4px solid currentColor;padding:14px;max-width:75%}p{white-space:pre-wrap;overflow-wrap:anywhere}strong{color:#8a6b28}@page{size:A4;margin:0}@media print{body{background:white}main{margin:0;width:210mm;min-height:297mm}}</style></head><body><div class="preview-watermark" aria-hidden="true"><span>${esc(watermark)}</span></div><main><header><strong>${esc(brand)}</strong><p><small>${esc(watermark)}</small></p></header><h1>${esc(title)}</h1><p>${fa?"شناسه":"Document ID"}: ${esc(id)}</p><p>${fa?"نسخه قالب":"Template version"}: ${esc(version)}</p><p>${fa?"مخاطب":"Recipient"}: ${esc(recipient)}</p><p>${esc(body)}</p><footer><small>${esc(note)}</small></footer></main></body></html>`;
}
