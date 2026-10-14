// Production identity gate — fail closed
// Run: node identity/engine/brand-release-gate.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const status=JSON.parse(fs.readFileSync(path.join(root,'brand-status.json'),'utf8'));
const required=['accurate Persian wordmark','custom vector paths reviewed','monochrome','small-size legibility','contrast','print proof','bilingual review','trademark clearance','template snapshots'];
const missing=required.filter(x=>!Array.isArray(status.approval_gates)||!status.approval_gates.includes(x));
if(missing.length)throw Error('Missing required approval gates: '+missing.join(', '));
if(status.primary_script!=='fa'||status.legacy_jr_svg_status!=='deprecated_concept_only')throw Error('Persian-first brand governance drift');
if(status.production_logo_status!=='approved_vector'||status.production_deploy_allowed!==true){
 console.error('BLOCKED: Persian production logo not approved. Do not merge/deploy brand assets.');
 process.exitCode=1;
}else{
 console.log('Brand approval status recorded; still requires independent release review.');
}
