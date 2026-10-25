/**
 * JREI Site Apprentice — read-only observation and knowledge-capsule policy.
 *
 * Observation is NOT training. A pushed commit is NOT an accepted solution,
 * a successful release, permission to operate, or proof of an AI rationale.
 * Never accepts hidden model reasoning or private ChatGPT conversation data.
 */
import {createHash} from 'node:crypto';

export const APPRENTICE_SCHEMA='jr.jrei.site-apprentice-observation.v1';
export const LESSON_SCHEMA='jr.jrei.site-apprentice-lesson.v1';
export const REPOSITORY='drrezazadeh65/drjavadrezazadeh.com';
const HEX=/^[a-f0-9]{40}$/i;
const PLAIN=x=>x!==null&&typeof x==='object'&&Object.getPrototypeOf(x)===Object.prototype;
const stripUnicode=s=>s.normalize('NFC');
const pathIsSafe=p=>typeof p==='string'&&p.length>0&&p.length<=320&&
  !p.startsWith('/')&&!p.includes('\\')&&!p.includes('\0')&&
  !p.split('/').some(seg=>seg===''||seg==='.'||seg==='..')&&
  !/(^|\/)(?:\.env(?:\..*)?|\.git|\.ssh|\.aws|node_modules|vendor|private|secrets?|credentials?|tokens?|backups?|dumps?|uploads?|student-records?|user-data)(\/|$)/i.test(p)&&
  !/\.(?:pem|key|p12|pfx|sqlite|db|sql\.gz|env|log)$/i.test(p);
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
const DOMAINS=Object.freeze(['CODE','UI_UX','DESIGN','SEO_GEO','CONTENT','OPERATIONS','SECURITY','DATA','AI_JREI','TESTING']);
const RISK=Object.freeze(['LOW','REVIEW','HIGH']);
const normalizeTime=time=>{
  if(typeof time!=='string'||time.length>40)return null;
  const t=Date.parse(time);
  if(!Number.isFinite(t))return null;
  return new Date(t).toISOString();
};

export function classifySiteWork(path){
  if(!pathIsSafe(path))return [];
  const p=path.toLowerCase();
  const domains=new Set();
  if(/\.(?:php|mjs|cjs|js|ts|tsx|jsx|py|sh|ps1|cmd)$/.test(p))domains.add('CODE');
  if(/(?:^|\/)(?:tests?|specs?|__tests__)(?:\/|$)|(?:\.test|\.spec)\./.test(p))
    domains.add('TESTING');
  if(/(?:^|\/)(?:assets\/(?:css|js)|fa|en|site|components|ui|ux)\//.test(p)||
     /\.(?:html|css|scss)$/.test(p))domains.add('UI_UX');
  if(/(?:design|visual|figma|layout|style|typography|brand|logo|theme)/.test(p))
    domains.add('DESIGN');
  if(/(?:seo|geo|aeo|schema|sitemap|robots|canonical|hreflang|metadata|structured-data)/.test(p))
    domains.add('SEO_GEO');
  if(/(?:content|article|publication|news|journal|translations?)/.test(p))
    domains.add('CONTENT');
  if(/(?:\.github\/workflows|deploy|release|cron|operations|worker|monitor|admin|cicd|ci-)/.test(p))
    domains.add('OPERATIONS');
  if(/(?:security|csrf|auth|privacy|sanit|consent|crypto|permissions?)/.test(p))
    domains.add('SECURITY');
  if(/(?:database|migrations|schema|sql|persistence|storage)/.test(p))
    domains.add('DATA');
  if(/(?:jrei|ai-|model|agent|llm|learning|retrieval|prompt|konkur|exam)/.test(p))
    domains.add('AI_JREI');
  if(domains.size===0)domains.add('OPERATIONS');
  return DOMAINS.filter(d=>domains.has(d));
}

/** Filename-only, bounded Git evidence. No patch, file content, chat or PII. */
export function observeSiteCommit({repository,sha,time,paths}={}){
  if(repository!==REPOSITORY||!HEX.test(sha??'')||
     !Array.isArray(paths)||paths.length>3000)throw Error('APPRENTICE_INVALID_GIT_EVENT');
  const iso=normalizeTime(time);
  if(iso===null)throw Error('APPRENTICE_INVALID_COMMIT_TIME');
  const unique=[...new Set(paths)].filter(pathIsSafe).sort();
  const observed=unique.slice(0,150);
  const categories={};
  for(const path of observed)for(const d of classifySiteWork(path))
    categories[d]=(categories[d]??0)+1;
  const record={
    schema:APPRENTICE_SCHEMA,source:'GITHUB_COMMIT_FILENAMES_ONLY',
    repository,commitSha:sha.toLowerCase(),commitTimeUtc:iso,
    changedFileCount:paths.length,
    eligibleFileCount:unique.length,enumeratedFileCount:observed.length,
    omittedSensitiveOrUnsupportedPathCount:paths.length-unique.length,
    truncated:unique.length>observed.length,
    categories,
    filePaths:observed,
    observationStatus:'OBSERVED_UNVERIFIED',
    deploymentVerified:false,testsVerified:false,
    scientificReviewVerified:false,ownerReleaseAuthorized:false,
    lessonsAccepted:false,autonomousActionsGranted:false
  };
  return Object.freeze({...record,recordDigestSha256:hash(record)});
}
const safeText=(x,max=600)=>{
  if(typeof x!=='string'||x.trim().length<10||x.length>max)return false;
  // Plain descriptions only: no links, identifiers or unstructured secrets.
  if(/(?:https?:\/\/|www\.|[A-Za-z0-9+/]{42,}={0,2}|-----BEGIN|sk-[A-Za-z0-9_-]{12,}|@|\b(?:api[_ -]?key|password|private[_ -]?key|access[_ -]?token)\b)/i.test(x))
    return false;
  return !/[\u0000-\u001f]/.test(x);
};

/**
 * A proposed lesson must be authored from observable decisions/results.
 * Its assertions are NOT independently checked by the pure module.
 * Independent review and original QA/release receipts are still required.
 */
export function proposeSiteLesson({observation,domain,problem,approach,
  verification,limitation,rollback,sourceRefs=[]}={}){
  if(!PLAIN(observation)||observation.schema!==APPRENTICE_SCHEMA||
    observation.observationStatus!=='OBSERVED_UNVERIFIED'||
    !HEX.test(observation.commitSha??'')||
    observation.repository!==REPOSITORY||
    !DOMAINS.includes(domain)||
    ![problem,approach,verification,limitation,rollback].every(x=>safeText(x))||
    !Array.isArray(sourceRefs)||sourceRefs.length>12||
    sourceRefs.some(x=>typeof x!=='string'||!/^([a-f0-9]{40}|[a-f0-9]{64})$/i.test(x)))
    throw Error('APPRENTICE_LESSON_REJECTED');
  const risk=domain==='SECURITY'||domain==='DATA'||domain==='OPERATIONS'?
    'HIGH':domain==='AI_JREI'||domain==='CODE'||domain==='SEO_GEO'?'REVIEW':'LOW';
  const record={
    schema:LESSON_SCHEMA,observationDigestSha256:observation.recordDigestSha256,
    repository:REPOSITORY,sourceCommitSha:observation.commitSha,
    domain,problem:stripUnicode(problem.trim()),
    approach:stripUnicode(approach.trim()),
    verification:stripUnicode(verification.trim()),
    limitation:stripUnicode(limitation.trim()),
    rollback:stripUnicode(rollback.trim()),
    evidenceDigests:[...new Set(sourceRefs.map(x=>x.toLowerCase()))].sort(),
    riskLevel:risk,trust:'UNREVIEWED_HUMAN_OR_AGENT_SUMMARY',
    status:'PROPOSED',deploymentVerified:false,
    acceptedForRetrieval:false,acceptedForModelTraining:false,
    canModifyProduction:false,canDeploy:false,canGrantPermissions:false
  };
  return Object.freeze({...record,lessonDigestSha256:hash(record)});
}

export function assessApprenticeAction({domain,action,proposalReviewed=false,
  ciVerified=false,liveDeployReceiptVerified=false,ownerAuthorized=false}={}){
  if(!DOMAINS.includes(domain))return Object.freeze({allowed:false,reason:'DOMAIN_NOT_REGISTERED'});
  // Future tools should have their own authenticated server-side policy.
  // This pure library never grants live infrastructure privileges.
  if(action==='READ_APPROVED_KNOWLEDGE')
    return Object.freeze({allowed:true,reason:'READ_ONLY_RETRIEVAL_SCOPE'});
  if(action==='PROPOSE_PATCH')
    return Object.freeze({allowed:true,reason:'ISOLATED_PROPOSAL_ONLY'});
  return Object.freeze({allowed:false,
    reason:proposalReviewed&&ciVerified&&liveDeployReceiptVerified&&ownerAuthorized?
      'SERVER_AUTHORIZATION_AND_SCOPED_TOOL_REQUIRED':'EVIDENCE_OR_OWNER_GATE_MISSING'});
}
