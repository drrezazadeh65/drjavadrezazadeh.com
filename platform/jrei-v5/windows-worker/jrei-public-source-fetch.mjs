/**
 * Owner-run read-only public-source acquisition:
 *
 * node jrei-public-source-fetch.mjs C:\path\approved-source.json
 *      C:\path\source-review.json --owner-reviewed-rights
 *
 * Run only AFTER final QA and a separate rights/robots/issuer check.
 * Does not touch Worker keys, live API, private config or mother database.
 * Never prints or saves fetched source bytes. The manifest is NOT an
 * independently verified amendment or scientific evidence.
 */
import {readFile,lstat} from 'node:fs/promises';
import {resolve,isAbsolute} from 'node:path';
import {acquireApprovedPublicSource} from '../jrei-authorized-https-acquisition.mjs';

async function jsonFile(path){
  if(typeof path!=='string'||!isAbsolute(path)||path.length>500)
    throw Error('SOURCE_INPUT_PATH_INVALID');
  const full=resolve(path);
  const stat=await lstat(full);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8192||
     stat.size<2)throw Error('SOURCE_INPUT_FILE_INVALID');
  return JSON.parse(await readFile(full,'utf8'));
}
async function run(){
  if(process.argv.length!==5||
     process.argv[4]!=='--owner-reviewed-rights')
    throw Error('OWNER_SOURCE_APPROVAL_REQUIRED');
  const source=await jsonFile(process.argv[2]);
  const review=await jsonFile(process.argv[3]);
  if(review?.sourceId!==source?.sourceId||
     review?.issuerAndTermsReviewed!==true||
     review?.noSensitiveRecordsConfirmed!==true||
     review?.reuseRightsReviewed!==true||
     review?.approvalDecision!=='AUTHORIZE_ONE_PUBLIC_ACQUISITION')
    throw Error('OWNER_SOURCE_REVIEW_INCOMPLETE');
  const proposal=await acquireApprovedPublicSource({
    approvedSource:source,
    ownerConfirmedRights:true,
    publicationDate:review?.verifiedPublicationDate??null,
    originSection:review?.originSection??null,
    preceding:review?.lastReviewedVersion??null
  });
  process.stdout.write(JSON.stringify({
    ...proposal,
    ownerReviewStatus:'SOURCE_VERSION_STAGED_ONLY',
    reviewRequired:true,verifiedOfficialAmendment:false
  },null,2)+'\n');
}
try{await run();}
catch(error){
  // No URL, document excerpts, credentials, paths or stack traces.
  const code=String(error?.message||'SOURCE_INTAKE_UNAVAILABLE');
  process.stderr.write('JREI_SOURCE_INTAKE_ERROR='+
    (/^[A-Z0-9_]{3,80}$/.test(code)?code:'SOURCE_INTAKE_UNAVAILABLE')+'\n');
  process.exitCode=1;
}
