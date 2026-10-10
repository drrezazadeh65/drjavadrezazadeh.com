import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const audit=path.join(root,'scripts/ai-crawler-policy-audit.mjs');
const robots=fs.readFileSync(path.join(root,'robots.txt'),'utf8');
const llms=fs.readFileSync(path.join(root,'llms.txt'),'utf8');

function runPolicy(robotsText,discoveryText=llms){
  const messages=[];
  let status=0;
  const source=fs.readFileSync(audit,'utf8').replace(/^import .*;\n/gm,'');
  const stopped=Symbol('audit exit');
  const context={
    fs:{readFileSync(file){
      if(path.basename(file)==='robots.txt') return robotsText;
      if(path.basename(file)==='llms.txt') return discoveryText;
      if(path.basename(file)==='ecosystem-registry.json') return fs.readFileSync(file,'utf8');
      throw new Error('Unexpected audit input: '+file);
    }},
    path,URL,
    process:{cwd:()=>root,exit(code){status=code;throw stopped;}},
    console:{log:(...args)=>messages.push(args.join(' ')),error:(...args)=>messages.push(args.join(' '))}
  };
  try{vm.runInNewContext(source,context,{filename:audit,timeout:1000});}
  catch(error){if(error!==stopped) throw error;}
  return {status,output:messages.join('\n')};
}

test('current public discovery remains open with private exclusions',()=>{
  const result=runPolicy(robots);
  assert.equal(result.status,0,result.output);
});

test('named crawler cannot rely on wildcard dashboard exclusion',()=>{
  const changed=robots.replace('Disallow: /fa/customer-dashboard/\n','');
  assert.notEqual(changed,robots);
  const result=runPolicy(changed);
  assert.notEqual(result.status,0);
  assert.match(result.output,/OAI-SearchBot policy must disallow private route \/fa\/customer-dashboard\//);
});

test('a specific private allow cannot override crawler exclusions',()=>{
  const changed=robots.replace('User-agent: bingbot\n','User-agent: bingbot\nAllow: /fa/customer-dashboard/orders/\n');
  assert.notEqual(changed,robots);
  const result=runPolicy(changed);
  assert.notEqual(result.status,0);
  assert.match(result.output,/bingbot policy overrides private exclusion/);
});

test('Persian Golden Talent checkout remains excluded for every named crawler',()=>{
  const changed=robots.replace('Disallow: /fa/shop/golden-talent/checkout/\n','');
  const result=runPolicy(changed);
  assert.notEqual(result.status,0);
  assert.match(result.output,/OAI-SearchBot policy must disallow private route \/fa\/shop\/golden-talent\/checkout\//);
});

for(const privateUrl of [
  'https://drjavadrezazadeh.com/en/account/orders/',
  'https://drjavadrezazadeh.com/api'
]){
  test('private discovery link rejected: '+privateUrl,()=>{
    const result=runPolicy(robots,llms+'\n- [Private]('+privateUrl+')\n');
    assert.notEqual(result.status,0);
    assert.match(result.output,/llms.txt exposes private\/transactional route/);
  });
}
