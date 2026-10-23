/**
 * JREI V5.1 — pure, bounded educational source-intake contract.
 *
 * Source approval precedes acquisition. Acquired bytes enter a REVIEW QUEUE;
 * they never become published evidence merely because a hash changed.
 *
 * This module deliberately performs NO network request, parser invocation,
 * filesystem write, inference call, source auto-approval or database mutation.
 * A future owner-authorized retrieval adapter must enforce robots, licences,
 * DNS/public-IP pinning, HTTPS-only redirects, MIME, size and response limits
 * before passing any public source bytes here.
 */
import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

const ID=/^[A-Za-z0-9._:-]{1,64}$/;
const SHA=/^[a-f0-9]{64}$/;
const TIME=/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const LIMITS=Object.freeze({HTML:2*1024*1024,
  TEXT:1024*1024,JSON:1024*1024,PDF:8*1024*1024});
const MIME=Object.freeze({HTML:['text/html'],
  TEXT:['text/plain'],JSON:['application/json'],
  PDF:['application/pdf']});
const RIGHTS=new Set(['PUBLIC_REUSE_APPROVED','METADATA_ONLY']);
const TRUST=new Set(['OFFICIAL','INSTITUTIONAL','PEER_REVIEWED']);
const methods=new Set(['OWNER_MANUAL_INTAKE','PUBLIC_HTTPS']);
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  Object.getPrototypeOf(x)===Object.prototype;
const iso=s=>typeof s==='string'&&TIME.test(s)&&
  !Number.isNaN(Date.parse(s))&&new Date(s).toISOString()===s;
const digest=b=>createHash('sha256').update(b).digest('hex');
const safeCode=msg=>typeof msg==='string'&&/^[A-Z0-9_]{3,80}$/.test(msg)
  ?msg:'INTAKE_CONTRACT_INVALID';

function canonicalPublicHttps(raw){
  if(typeof raw!=='string'||raw.length>600||raw.includes('\\')||
     /[\u0000-\u0020]/.test(raw))throw Error('SOURCE_URL_INVALID');
  let url;
  try{url=new URL(raw);}catch{throw Error('SOURCE_URL_INVALID');}
  if(url.protocol!=='https:'||url.username||url.password||url.hash||
     (url.port&&url.port!=='443'))
    throw Error('SOURCE_URL_NOT_CANONICAL_HTTPS');
  const host=url.hostname.toLowerCase().replace(/\.$/,'');
  if(host!==url.hostname||host.length>253||!host.includes('.')||
     isIP(host)!==0||host==='localhost'||host.endsWith('.local')||
     host.endsWith('.localhost')||host.endsWith('.internal')||
     host.endsWith('.test')||host.endsWith('.invalid')||
     host.endsWith('.example'))
    throw Error('SOURCE_HOST_NOT_PUBLIC');
  // This is only a preflight. DNS must still be resolved and pinned by the
  // *transport* to avoid DNS rebinding/private addresses and unsafe redirects.
  return url.href;
}

export function normalizeApprovedSource(entry){
  if(!object(entry)||Object.keys(entry).sort().join(',')!==
    'acquisitionMethod,canonicalUrl,contentType,issuer,language,licenceCode,reviewStatus,reviewedBy,sourceId,trustClass,updateIntervalHours,usageRights')
    throw Error('SOURCE_REGISTRY_SHAPE_INVALID');
  if(!ID.test(entry.sourceId)||!ID.test(entry.reviewedBy)||
     typeof entry.issuer!=='string'||entry.issuer.length<3||
     entry.issuer.length>160||
     typeof entry.licenceCode!=='string'||
     !/^[A-Za-z0-9._:+/-]{3,80}$/.test(entry.licenceCode)||
     !own(LIMITS,entry.contentType)||!['fa','en','mixed'].includes(entry.language)||
     !RIGHTS.has(entry.usageRights)||!TRUST.has(entry.trustClass)||
     !methods.has(entry.acquisitionMethod)||
     entry.reviewStatus!=='APPROVED'||
     !Number.isInteger(entry.updateIntervalHours)||
     entry.updateIntervalHours<12||entry.updateIntervalHours>2160)
    throw Error('SOURCE_NOT_APPROVED_FOR_INTAKE');
  const canonicalUrl=canonicalPublicHttps(entry.canonicalUrl);
  return Object.freeze({...entry,canonicalUrl});
}

export function stageSourceVersion({
  approvedSource,bytes,observedAt,declaredMime,publicationDate=null,
  preceding=null,originSection=null
}={}){
  const source=normalizeApprovedSource(approvedSource);
  if(source.usageRights!=='PUBLIC_REUSE_APPROVED')
    throw Error('FULL_TEXT_USE_NOT_AUTHORIZED');
  if(!(bytes instanceof Uint8Array)||!bytes.length||
     bytes.length>LIMITS[source.contentType])
    throw Error('SOURCE_BYTES_OUT_OF_BOUNDS');
  if(typeof declaredMime!=='string'||
     !MIME[source.contentType].includes(declaredMime.toLowerCase()))
    throw Error('SOURCE_MIME_NOT_APPROVED');
  if(source.contentType==='PDF' &&
     Buffer.from(bytes.subarray(0,5)).toString('ascii')!=='%PDF-')
    throw Error('SOURCE_PDF_SIGNATURE_MISMATCH');
  if(!iso(observedAt)||publicationDate!==null&&!iso(publicationDate)||
     originSection!==null&&(typeof originSection!=='string'||
     originSection.length<1||originSection.length>100))
    throw Error('SOURCE_PROVENANCE_INVALID');
  if(preceding!==null&&(!object(preceding)||!SHA.test(preceding.documentSha256)||
     preceding.sourceId!==source.sourceId))
    throw Error('PREVIOUS_SOURCE_VERSION_INVALID');
  const documentSha256=digest(bytes);
  const change=preceding===null?'FIRST_SEEN':
    preceding.documentSha256===documentSha256?'UNCHANGED':'CHANGED';
  // Do not store fetched bytes or call the old version superseded until a
  // human verifies the issuing authority, legal rights and actual amendment.
  return Object.freeze({
    schema:'jr.jrei.source-intake-proposal.v1',
    sourceId:source.sourceId,
    canonicalUrl:source.canonicalUrl,
    issuer:source.issuer,contentType:source.contentType,
    language:source.language,licenceCode:source.licenceCode,
    retrievedAt:observedAt,publicationDate,originSection,
    documentSha256,byteCount:bytes.length,
    previousDocumentSha256:preceding?.documentSha256??null,
    observedChange:change,reviewStatus:'PENDING_REVIEW',
    scientificallyValidated:false,
    officialAmendmentVerified:false,published:false,
    permittedNextStep:'HUMAN_SOURCE_VERSION_REVIEW'
  });
}
export function sourceIntakeErrorCode(error){
  return safeCode(error?.message);
}
