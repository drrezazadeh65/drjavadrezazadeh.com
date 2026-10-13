#!/usr/bin/env node
/**
 * Classify the COMPLETE source delta since Bertina's verified live release SHA.
 * Only public documents and static assets may be promoted automatically.
 * All runtime, credentials, financial, database, workflow and test changes are
 * kept behind the owner-authorised controlled manual release workflow.
 *
 * This program never performs a network, payment, database or deployment action.
 */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const PUBLIC_ROOT_FILES = new Set([
  'index.html', '404.html', 'offline.html', 'robots.txt', 'llms.txt',
  'feed.xml', 'sitemap.xml', 'favicon.ico', 'favicon.png', 'favicon.svg',
  'site.webmanifest', 'manifest.json'
]);
const STATIC_ASSET = /^(?:assets\/(?:images|css|fonts|icons)\/)\S+\.(?:html|css|svg|png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf|eot)$/i;
const STATIC_PAGE = /^(?:fa|en|journal)\/\S+\.(?:html|css|svg|png|jpe?g|webp|avif|gif)$/i;
const PRIVATE_SEGMENT = /(?:^|\/)(?:api|app|private|internal|auth|admin|account|login|register|recover|bazyabi-hesab|checkout|cart|(?:order|receipt|refund|payment)(?:[-_][a-z0-9-]+)?|orders|receipts|refunds|booking|(?:[a-z0-9-]+-)?dashboard|donation|assessment|assessments|observer|roles|student|parent|teacher|plans|submission|request-consultation|darkhast-moshavere|reviewer-registration)(?:\/|$)/i;
const SECRET_OR_RUNTIME_EXTENSION = /(?:^|\/)(?:\.env(?:\.[^/]*)?|\.htaccess|\.user\.ini|php\.ini|composer\.(?:json|lock)|package(?:-lock)?\.json)$|\.(?:php\d?|sql|sh|py|mjs|cjs|js|yml|yaml|pem|key|p12|pfx|crt|conf|ini)$/i;
const POLICY_DOCUMENTS = new Set([
  'docs/governance/V5_CONTROLLED_CPANEL_RELEASE_20261013.md',
  'docs/BERTINA_PRIVATE_BACKUP.md',
  'docs/BERTINA_MIGRATION.md'
]);

export function classifyPath(path) {
  if (typeof path !== 'string' || !path || path.includes('\\') || path.includes('\0') ||
      path.startsWith('/') || path.startsWith('./') || path.split('/').some(part=>!part || part === '.' || part === '..')) {
    return 'controlled';
  }
  if (path === '.bertina-deploy-trigger') return 'public';
  if (path === '.bertina-backup-trigger') return 'controlled';
  if (POLICY_DOCUMENTS.has(path)) return 'controlled';
  if (path.startsWith('docs/')) {
    // docs/ is explicitly omitted from scripts/build-public-site.mjs; MD/TXT
    // is non-deploying evidence, but SQL, JSON and policy documents are guarded.
    return /\.(?:md|txt)$/i.test(path) ? 'unshipped' : 'controlled';
  }
  if (SECRET_OR_RUNTIME_EXTENSION.test(path)) return 'controlled';
  if (/^(?:api|platform|foundation|edge|payment-api|database|migrations|tests|scripts|\.github)\//.test(path)) return 'controlled';
  if (path.startsWith('assets/data/') || path.startsWith('assets/js/')) return 'controlled';
  if (path === 'sw.js' || path === 'AGENTS.md' || path === 'README.md') return 'controlled';
  if (path === 'journal/sitemap.xml' || path === 'journal/announcements.atom') return 'public';
  if (PRIVATE_SEGMENT.test(path)) return 'controlled';
  if (PUBLIC_ROOT_FILES.has(path) || /^sitemap-[a-z0-9-]+\.xml$/.test(path)) return 'public';
  if (STATIC_ASSET.test(path) || STATIC_PAGE.test(path)) return 'public';
  return 'controlled';
}

export function classifyPaths(paths) {
  const unique=[...new Set(paths)];
  const groups={public:[],unshipped:[],controlled:[]};
  for (const path of unique) groups[classifyPath(path)].push(path);
  return {groups, canAutomaticallyDeploy:groups.controlled.length===0 && groups.public.length>0};
}

function runGit(args) {
  const result=spawnSync('git',args,{encoding:'buffer',maxBuffer:4_000_000});
  if (result.error || result.status!==0) throw Error('Git command failed (exit '+result.status+'): '+args[0]);
  return result.stdout;
}

export function classifyGitDelta(base,head) {
  if (!/^[a-f0-9]{40}$/.test(base)||!/^[a-f0-9]{40}$/.test(head)) throw Error('Both full 40-character Git SHAs are required');
  // A different history/rebase requires explicit manual recovery review.
  runGit(['merge-base','--is-ancestor',base,head]);
  // No rename suppression bypass: --no-renames surfaces both removal and addition.
  const output=runGit(['diff','--name-only','--no-renames','-z',base,head]);
  const paths=output.toString('utf8').split('\0').filter(Boolean);
  return {base,head,...classifyPaths(paths)};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [base,head]=process.argv.slice(2);
    const result=classifyGitDelta(base,head);
    const {groups}=result;
    const status=result.canAutomaticallyDeploy?'AUTHORIZED_PUBLIC_ONLY':'MANUAL_REVIEW_REQUIRED';
    const lines=[
      'Automatic deployment classification: '+status,
      'Baseline live commit: '+base,
      'Target source commit: '+head,
      'Public/static paths: '+groups.public.length+'; non-shipped documentation: '+groups.unshipped.length+'; controlled paths: '+groups.controlled.length,
      ...groups.controlled.slice(0,40).map(path=>'Requires controlled release: '+path)
    ];
    for (const line of lines) console.log(line);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
    if (!result.canAutomaticallyDeploy) process.exitCode=1;
  } catch (error) {
    console.error('Automatic production release refused (fail-closed): '+error.message);
    process.exitCode=1;
  }
}
