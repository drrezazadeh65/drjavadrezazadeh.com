/**
 * Local, read-only and owner-invoked provenance manifest generator.
 *
 * node jrei-public-corpus-manifest.mjs C:\absolute\reviewed.json DATASET_ID EVAL_VERSION C:\absolute\baseline.json
 *
 * This program does NOT sign/register a node, edit its private config,
 * activate an evaluation, contact Bertina or certify independent review.
 * Only aggregate hashes/counts are printed; NO corpus excerpts or labels.
 */
import { readFile, lstat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  fingerprintReviewedRetrievalCorpus
} from '../jrei-reviewed-retrieval-evaluator.mjs';
import { normalizeRetrievalPolicy } from '../jrei-learning-loop.mjs';

const ID=/^[A-Za-z0-9._:-]{1,64}$/;
async function localJson(path,limit){
  if(typeof path!=='string'||!isAbsolute(path)||path.length>500)
    throw Error('ABSOLUTE_LOCAL_FILE_REQUIRED');
  const full=resolve(path);
  const info=await lstat(full);
  if(!info.isFile()||info.isSymbolicLink()||info.size<2||
     info.size>limit)throw Error('OWNER_LOCAL_FILE_NOT_APPROVED');
  // The digest code validates evidence provenance and excludes PII patterns.
  const text=await readFile(full,'utf8');
  if(Buffer.byteLength(text)>limit)throw Error('LOCAL_FILE_SIZE_LIMIT');
  return {value:JSON.parse(text),path:full};
}

async function main(){
  const [corpusPath,id,evaluationVersion,policyPath]=process.argv.slice(2);
  if(process.argv.length!==6||!ID.test(id??'')||
     !ID.test(evaluationVersion??''))throw Error('MANIFEST_ARGUMENTS_INVALID');
  const {value:corpus,path}=await localJson(corpusPath,8*1024*1024);
  if(!corpus||Array.isArray(corpus)||typeof corpus!=='object'||
     Object.keys(corpus).sort().join(',')!=='heldOutCases,reviewedEvidence')
    throw Error('PUBLIC_CORPUS_SHAPE_INVALID');
  const {value:policy}=await localJson(policyPath,4096);
  const active=normalizeRetrievalPolicy(policy);
  if(!active)throw Error('ACTIVE_POLICY_INVALID');
  const fingerprint=fingerprintReviewedRetrievalCorpus(corpus);
  if(fingerprint.caseCount<200)throw Error('REVIEWED_HOLDOUT_MINIMUM_NOT_MET');
  const activePolicySha256=createHash('sha256')
    .update(JSON.stringify(active)).digest('hex');
  const manifest={
    schema:'jr.jrei.public-corpus-manifest.v1',
    datasetId:id,evaluationVersion,
    datasetSha256:fingerprint.datasetSha256,
    evidenceSha256:fingerprint.evidenceSha256,
    activePolicySha256,
    reviewedCaseCountClaimed:fingerprint.caseCount,
    publicEvidenceRecords:fingerprint.sourceCount,
    currentPolicy:active,
    ownerApprovalStatus:'PENDING_INDEPENDENT_REVIEW',
    scientificValidation:'NOT_ESTABLISHED',
    // Owner must separately inspect provenance and permission before replacing
    // this false value in the private config on THAT SAME Windows computer.
    localDatasetTemplate:{
      id,datasetSha256:fingerprint.datasetSha256,
      evidenceSha256:fingerprint.evidenceSha256,
      evaluationVersion,activePolicySha256,path:corpus,
      originalSourceReviewed:false
    }
  };
  process.stdout.write(JSON.stringify(manifest,null,2)+'\n');
}
try{await main();}
catch(error){
  const m=String(error?.message||'MANIFEST_UNAVAILABLE');
  const code=/^[A-Z0-9_]{3,80}$/.test(m)?m:'MANIFEST_UNAVAILABLE';
  process.stderr.write('JREI_MANIFEST_ERROR='+code+'\n');
  process.exitCode=1;
}
