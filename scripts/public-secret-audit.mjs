import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const ignoredDirs=new Set(['.git','node_modules']);
const failures=[];
const textFiles=[];

const forbiddenExt=new Set(['.pem','.p12','.pfx','.jks']);
const forbiddenNames=new Set(['.env','.env.local','.env.production','.npmrc']);

function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignoredDirs.has(ent.name)) continue;
    const full=path.join(dir,ent.name);
    const rel=path.relative(root,full).replaceAll(path.sep,'/');
    if(ent.isDirectory()){
      walk(full);
      continue;
    }
    if(!ent.isFile()) continue;
    if(forbiddenNames.has(ent.name)||forbiddenExt.has(path.extname(ent.name).toLowerCase())){
      failures.push(rel+': secret-bearing file type/name must not be committed');
    }
    if(/\.(html?|js|mjs|cjs|json|jsonc|yml|yaml|txt|md|xml|css)$/i.test(ent.name)){
      textFiles.push({full,rel});
    }
  }
}
walk(root);

const detectors=[
  ['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['GitHub classic token',/\bghp_[A-Za-z0-9]{30,}\b/g],
  ['GitHub fine-grained token',/\bgithub_pat_[A-Za-z0-9_]{40,}\b/g],
  ['OpenAI-style secret key',/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
  ['Stripe live secret',/\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/g],
  ['AWS access key id',/\bAKIA[0-9A-Z]{16}\b/g],
  ['Google API key',/\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['Slack token',/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ['hard-coded Bearer credential',/Authorization\s*[:=]\s*["']?Bearer\s+[A-Za-z0-9._~+\/-]{24,}/gi],
  ['credential embedded in URL',/https?:\/\/[^\s"'<>:@\/]+:[^\s"'<>@\/]+@/gi]
];

for(const {full,rel} of textFiles){
  let text;
  try{text=fs.readFileSync(full,'utf8');}catch{continue;}
  for(const [label,re] of detectors){
    re.lastIndex=0;
    if(re.test(text)) failures.push(rel+': possible '+label+' exposure');
  }
}

console.log('Public secret audit: '+textFiles.length+' text/config files scanned.');
if(failures.length){
  console.error('Secret exposure failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('No committed private credentials or high-risk secret file types detected.');
