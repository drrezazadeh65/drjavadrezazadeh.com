#!/usr/bin/env node
/**
 * Read-only site apprenticeship recorder for CI. It captures ONLY Git file
 * names and trusted commit metadata. No diffs, prompts, secrets, or answers.
 * Output is a short-lived internal artifact, NEVER a training dataset.
 */
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {observeSiteCommit,REPOSITORY}
  from '../platform/jrei-v5/jrei-site-apprentice.mjs';

const SHA=/^[a-f0-9]{40}$/i;
function git(args){
  return execFileSync('git',args,{
    cwd:process.cwd(),encoding:'utf8',timeout:12000,
    maxBuffer:1024*1024,
    stdio:['ignore','pipe','pipe']
  }).trimEnd();
}
async function main(){
  const repository=process.env.GITHUB_REPOSITORY;
  const sha=process.env.GITHUB_SHA;
  if(repository!==REPOSITORY||!SHA.test(sha??''))
    throw Error('APPRENTICE_ONLY_AUTHORIZED_REPOSITORY_SHA');
  const actual=git(['rev-parse','HEAD']).toLowerCase();
  if(actual!==sha.toLowerCase())throw Error('APPRENTICE_SHA_MISMATCH');
  // Bounded, fixed-argument Git reads; never evaluate commit messages/patches.
  const time=git(['show','--no-patch','--format=%cI',sha]);
  const raw=execFileSync('git',[
    'diff-tree','--root','--no-commit-id','--name-only','--no-renames','-r','-z',sha,'--'
  ],{cwd:process.cwd(),encoding:'utf8',timeout:12000,
     maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']});
  const paths=raw.split('\0').filter(Boolean);
  const capsule=observeSiteCommit({repository,sha,time,paths});
  const base=process.env.RUNNER_TEMP?resolve(process.env.RUNNER_TEMP):tmpdir();
  const dir=join(base,'jrei-site-apprentice');
  await mkdir(dir,{recursive:true,mode:0o700});
  await writeFile(join(dir,'git-work-observation.json'),
    JSON.stringify(capsule,null,2)+'\n',{flag:'w',mode:0o600});
  // Do not print filenames or discussions into the Actions job log.
  process.stdout.write('[JREI] SOURCE_WORK_OBSERVED_UNVERIFIED\n');
  process.stdout.write('[JREI] DOMAINS='+Object.keys(capsule.categories).join(',')+'\n');
  process.stdout.write('[JREI] CHANGED_FILES='+capsule.changedFileCount+'\n');
  process.stdout.write('[JREI] FILE_CONTENTS_CAPTURED=0\n');
  process.stdout.write('[JREI] PRIVATE_CHAT_CAPTURED=0\n');
  process.stdout.write('[JREI] NO_MODEL_TRAINING_OR_PRODUCTION_CHANGES\n');
}
main().catch(e=>{
  const reason=String(e?.message??'APPRENTICE_OBSERVER_FAILED');
  process.stderr.write('[JREI] '+
    (/^[A-Z0-9_]{6,90}$/.test(reason)?reason:'APPRENTICE_OBSERVER_FAILED')+'\n');
  process.exitCode=1;
});
