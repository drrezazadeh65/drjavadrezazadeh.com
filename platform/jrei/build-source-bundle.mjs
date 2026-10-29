#!/usr/bin/env node
// Explicit, source-only JREI consolidation. Never deploys or moves live files.
import {execFileSync} from "node:child_process";
import {mkdirSync,copyFileSync,writeFileSync,rmSync,statSync} from "node:fs";
import {join,resolve,dirname,relative,sep} from "node:path";
import {createHash} from "node:crypto";
const root=resolve(import.meta.dirname,"../..");
const out=resolve(process.argv[2]||join(root,"platform/jrei/_source_bundle"));
if(out===root||!out.startsWith(root+sep)||!out.includes(sep+"platform"+sep+"jrei"+sep)) throw Error("Output must be within platform/jrei");
const tracked=execFileSync("git",["ls-files","-z"],{cwd:root,encoding:"buffer"}).toString("utf8").split("\0").filter(Boolean);
const selected=tracked.filter(p=>/^(platform\/jrei-python\/|platform\/jrei-v5\/|platform\/jrei\/|api\/(?:internal\/)?jrei[^/]*|docs\/.*jrei|tests\/.*jrei|\.github\/workflows\/.*jrei)/i.test(p)&&!p.startsWith("platform/jrei/_source_bundle/")&&!p.includes("/.env")&&!/\.(?:pem|key|p12|pfx|sqlite|db|gguf|safetensors)$/i.test(p));
if(!selected.length)throw Error("No JREI source found");
if(out===resolve(root,"platform/jrei"))throw Error("Refusing to overwrite source workspace");
rmSync(out,{recursive:true,force:true});mkdirSync(out,{recursive:true});
const manifest=[];
for(const path of selected){const from=resolve(root,path);if(!from.startsWith(root+sep)||!statSync(from).isFile())continue;const to=join(out,path);mkdirSync(dirname(to),{recursive:true});copyFileSync(from,to);const data=execFileSync("git",["hash-object",path],{cwd:root,encoding:"utf8"}).trim();manifest.push({path,git_blob_sha:data});}
writeFileSync(join(out,"MANIFEST.json"),JSON.stringify({kind:"JREI_TRACKED_SOURCE_BUNDLE",source_branch:"migration/bertina-linux6",files:manifest},null,2)+"\n");
process.stdout.write("Bundled "+manifest.length+" tracked JREI source files into "+relative(root,out)+"\n");
