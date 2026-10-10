import fs from 'node:fs';

const root='.github/workflows/';
const workflows=fs.readdirSync(root).filter(name=>name.endsWith('.yml'));
const failures=[];
for(const name of workflows){
  const source=fs.readFileSync(root+name,'utf8');
  if(/branches:\s*\[[^\]]*\bmain\b|^\s+- main\s*$/m.test(source)) failures.push(name+': stale main trigger');
  if(/contents:\s*write|git push|HEAD:main|ref:\s*main\b/.test(source)) failures.push(name+': automatic source writer or main checkout');
  if(/(?:working-directory:\s*edge\/|node (?:--check |--test )?edge\/|['"](?:payment-api|edge)\/)/.test(source)) failures.push(name+': removed runtime input');
  if(source.includes('  schedule:')&&!source.includes("github.event_name == 'schedule' && 'migration/bertina-linux6'")) failures.push(name+': scheduled checkout must select Bertina source');
}

for(const name of ['bertina-autossl.yml','bertina-commerce-schema-migrate.yml','bertina-ftps-data-diagnostic.yml','bertina-php-cache-diagnostic.yml','indexnow-submit.yml']){
  const source=fs.readFileSync(root+name,'utf8');
  if(source.includes('  push:')||source.includes('  pull_request:')||!source.includes('  workflow_dispatch:')) failures.push(name+': production mutation must be manual');
  if(!source.includes("if: github.ref == 'refs/heads/migration/bertina-linux6'")) failures.push(name+': missing production branch guard');
}
const deploy=fs.readFileSync(root+'deploy-bertina.yml','utf8');
if(!fs.readFileSync(root+'indexnow-activation.yml','utf8').includes("if: inputs.mode != 'live' || github.ref == 'refs/heads/migration/bertina-linux6'")) failures.push('Live IndexNow activation must use the active Bertina branch');
if(deploy.includes("      - '.github/workflows/deploy-bertina.yml'")) failures.push('Deployment workflow edits must not deploy on merge');
if(!deploy.includes("if: github.ref == 'refs/heads/migration/bertina-linux6'")||!deploy.includes('test "$current" = "$GITHUB_SHA"')) failures.push('Deploy must reject wrong branch and stale commit');
for(const name of ['bertina-master-seo.yml','bertina-provider-guard.yml','browser-qa.yml','full-route-responsive-certification.yml','full-route-visual-crawl.yml']){
  if(!fs.readFileSync(root+name,'utf8').includes('  pull_request:')) failures.push(name+': missing PR gate');
}
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('Workflow governance PASS: '+workflows.length+' workflows; Bertina source, read-only CI and guarded production actions.');
