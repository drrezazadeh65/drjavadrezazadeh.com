/**
 * Source-only release compiler for immutable shared public stylesheets.
 * Called ONLY by the owner-controlled, already approved release assembler.
 * Copies two stable common stylesheets into content-addressed aliases and
 * upgrades HTML stylesheet references in the staged public artifact.
 * Does not change source HTML, private cache policy, URLs, or the mother DB.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const CORE_STYLES=Object.freeze([
  'style',
  'public-v2'
]);
const HTML_PATH=/\.html$/i;
const NONPUBLIC_DIRS=new Set(['api','internal','private','node_modules','.git']);

function scanHtml(directory,relative='',result=[]){
  for(const dirent of fs.readdirSync(directory,{withFileTypes:true})){
    if(NONPUBLIC_DIRS.has(dirent.name))continue;
    const file=path.join(directory,dirent.name);
    const rel=relative?relative+'/'+dirent.name:dirent.name;
    if(dirent.isDirectory())scanHtml(file,rel,result);
    else if(dirent.isFile()&&HTML_PATH.test(dirent.name))result.push(file);
  }
  return result;
}

export function fingerprintCoreStyles(releaseDirectory){
  const output=path.resolve(releaseDirectory);
  const assetDirectory=path.join(output,'assets/css');
  const aliasMap=new Map();
  if(!fs.statSync(output).isDirectory())throw new Error('Expected sanitized release directory');
  for(const name of CORE_STYLES){
    const original=path.join(assetDirectory,name+'.css');
    const body=fs.readFileSync(original);
    if(body.length<1000)throw new Error('Refusing unexpected shared style '+name);
    const digest=crypto.createHash('sha256').update(body).digest('hex').slice(0,12);
    const alias=name+'.'+digest+'.css';
    // Rebuilding the same staged artifact must be idempotent; a published
    // fingerprint may never be silently replaced with different bytes.
    const outputFile=path.join(assetDirectory,alias);
    if(fs.existsSync(outputFile)){
      if(!fs.readFileSync(outputFile).equals(body))
        throw new Error('Content-addressed stylesheet collision: '+alias);
    }else fs.writeFileSync(outputFile,body,{flag:'wx',mode:0o644});
    aliasMap.set(name,alias);
  }

  let revisedPages=0,rewrittenReferences=0;
  for(const filename of scanHtml(output)){
    const original=fs.readFileSync(filename,'utf8');
    let substitutions=0;
    const changed=original.replace(
      /((?:href)\s*=\s*["'])([^"']*\/?assets\/css\/)(style|public-v2)\.css(?:\?[^"']*)?(["'])/gi,
      (match,prefix,base,name,quote)=>{
        if(!aliasMap.has(name))return match;
        substitutions++;
        return prefix+base+aliasMap.get(name)+quote;
      }
    );
    if(substitutions){
      fs.writeFileSync(filename,changed);
      revisedPages++;
      rewrittenReferences+=substitutions;
    }
  }

  return Object.freeze({
    schema:'jr.immutable.shared-styles.v1',
    aliases:Object.fromEntries(aliasMap),
    revisedPages,
    rewrittenReferences
  });
}
