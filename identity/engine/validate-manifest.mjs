import {readFileSync, existsSync} from "node:fs";
import {resolve, dirname, sep} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const manifest=JSON.parse(readFileSync(resolve(root,"template-manifest.json"),"utf8"));
const types=new Set(["letterhead","certificate","talent_report","invoice","receipt","assessment"]);
const locales=new Set(["fa-IR","en"]);
const seen=new Set();
if(manifest.status!=="prototype") throw Error("Unreviewed manifest status");
if(!Array.isArray(manifest.templates)||manifest.templates.length===0) throw Error("No templates");
for(const entry of manifest.templates){
 if(!entry||typeof entry!=="object") throw Error("Invalid entry");
 if(!/^[a-z][a-z0-9-]+$/.test(entry.id)) throw Error("Invalid template id");
 if(seen.has(entry.id)) throw Error("Duplicate template id: "+entry.id);
 seen.add(entry.id);
 if(!types.has(entry.type)||!locales.has(entry.locale)) throw Error("Invalid type/locale: "+entry.id);
 if(typeof entry.path!=="string"||!/^((templates|examples)\/)[a-z0-9/-]+\.html$/.test(entry.path)) throw Error("Unsafe template path");
 const file=resolve(root,entry.path);
 if(!file.startsWith(root+sep)||!existsSync(file)) throw Error("Missing template: "+entry.path);
 const html=readFileSync(file,"utf8");
 const lang=entry.locale==="fa-IR"?"fa":"en";
 if(!html.includes('lang="'+lang+'"')||!html.includes('dir="'+(lang==="fa"?"rtl":"ltr")+'"')) throw Error("Locale/direction mismatch: "+entry.id);
 if(!html.includes("document.css")||!html.includes("tokens.css")) throw Error("Missing shared styles: "+entry.id);
}
if(manifest.rules?.unapproved_brand_assets!==true) throw Error("Brand asset approval gate removed");
console.log("Identity template registry validated: "+seen.size+" prototype templates.");
