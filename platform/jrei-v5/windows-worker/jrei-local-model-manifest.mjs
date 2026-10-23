/**
 * JREI owner-invoked, OFFLINE model artefact fingerprinting.
 *
 * Usage (only after explicitly authorised model acquisition):
 * node jrei-local-model-manifest.mjs C:\absolute\approved-model.gguf MODEL_ID MODEL_VERSION LICENCE_CODE
 *
 * No model download, inference execution, environment variable changes,
 * server calls, personal data reads, keys, node registration or startup tasks.
 * A SHA256 match proves only byte identity, not trust, model quality or rights.
 */
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat,open} from 'node:fs/promises';
import {resolve,isAbsolute,extname} from 'node:path';

const ID=/^[A-Za-z0-9._:-]{1,64}$/;
const LICENCE=/^[A-Za-z0-9._:+/-]{3,80}$/;
const MAX_SIZE=50*1024*1024*1024;

async function checksum(file){
  if(typeof file!=='string'||!isAbsolute(file)||file.length>500||
     extname(file).toLowerCase()!=='.gguf')
    throw Error('APPROVED_GGUF_ABSOLUTE_PATH_REQUIRED');
  const path=resolve(file);
  const before=await lstat(path);
  if(!before.isFile()||before.isSymbolicLink()||before.size<4096||
     before.size>MAX_SIZE)
    throw Error('MODEL_FILE_NOT_REGULAR_OR_SIZE_INVALID');
  // Re-open with read-only descriptor. Device files and symlinks are excluded
  // before streaming; the file stat is checked again after streaming.
  const fd=await open(path,'r');
  try{
    const descriptor=await fd.stat();
    if(!descriptor.isFile()||descriptor.size!==before.size||
       descriptor.ino!==before.ino)
      throw Error('MODEL_FILE_CHANGED_BEFORE_READ');
    const hash=createHash('sha256');
    const stream=createReadStream(null,{
      fd:fd.fd,autoClose:false,highWaterMark:1024*1024
    });
    let size=0;
    for await(const chunk of stream){
      size+=chunk.byteLength;
      if(size>MAX_SIZE)throw Error('MODEL_FILE_READ_LIMIT_EXCEEDED');
      hash.update(chunk);
    }
    const after=await fd.stat();
    if(size!==before.size||after.size!==before.size||
       after.mtimeMs!==before.mtimeMs)
      throw Error('MODEL_FILE_CHANGED_DURING_HASH');
    return {artifactSha256:hash.digest('hex'),artifactBytes:size};
  }finally{await fd.close();}
}
async function main(){
  const [file,id,version,licence]=process.argv.slice(2);
  if(process.argv.length!==6||!ID.test(id??'')||
     !ID.test(version??'')||!LICENCE.test(licence??''))
    throw Error('MODEL_MANIFEST_ARGUMENTS_INVALID');
  const digest=await checksum(file);
  process.stdout.write(JSON.stringify({
    schema:'jr.jrei.local-model-manifest.v1',
    modelId:id,modelVersion:version,licenceCode:licence,
    ...digest,modelRuntime:'NOT_STARTED',
    weightsVerifiedAgainstRegistry:false,
    licenceIndependentlyVerified:false,
    inferenceMeasured:false,qualityBenchmarked:false,
    ownerRightsReviewRequired:true,automaticallyActivated:false
  },null,2)+'\n');
}
try{await main();}
catch(error){
  const code=String(error?.message||'MODEL_MANIFEST_FAILED');
  process.stderr.write('JREI_MODEL_MANIFEST_ERROR='+
    (/^[A-Z0-9_]{3,80}$/.test(code)?code:'MODEL_MANIFEST_FAILED')+'\n');
  process.exitCode=1;
}
