import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const output=process.argv[2]||'/tmp/operations-tls.json';
const origin='188.40.203.218',apex='drjavadrezazadeh.com',www='www.drjavadrezazadeh.com';
const report={schema:'operations-tls-v1',commit:process.env.GITHUB_SHA||null,runId:process.env.GITHUB_RUN_ID||null,checkedAt:Math.floor(Date.now()/1000),observer:'independent-runner-direct-tcp-and-public-dns',certificates:[],checks:[],ok:false};
const run=(name,args,input='')=>execFileSync(name,args,{input,encoding:'utf8',timeout:25000,maxBuffer:1048576,stdio:['pipe','pipe','pipe']});
try{
 for(const host of [apex,www]){
  const raw=run('openssl',['s_client','-connect',origin+':443','-servername',host,'-verify_hostname',host,'-verify_return_error','-CApath','/etc/ssl/certs','-showcerts']);
  const pem=raw.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)?.[0];if(!pem)throw Error('Certificate missing for '+host);
  const certificate=new crypto.X509Certificate(pem);if(!certificate.checkHost(host))throw Error('Hostname mismatch for '+host);
  const expiresAt=Math.floor(Date.parse(certificate.validTo)/1000);if(expiresAt<=report.checkedAt+604800)throw Error('Certificate expires within seven days for '+host);
  report.certificates.push({host,issuer:certificate.issuer,subject:certificate.subject,san:certificate.subjectAltName,fingerprint256:certificate.fingerprint256,notBefore:certificate.validFrom,notAfter:certificate.validTo,expiresAt});
  report.checks.push({name:host+' origin CA-chain hostname and expiry',passed:true});
  for(const target of ['origin','public']){
   const args=['--noproxy','*','--silent','--show-error','--max-time','20','--head'];if(target==='origin')args.push('--resolve',host+':443:'+origin);
   args.push('https://'+host+'/');const headers=run('curl',args).replaceAll('\r','');
   const status=Number(headers.match(/^HTTP\/\S+ (\d+)/m)?.[1]);const location=headers.match(/^location:\s*(\S+)/im)?.[1];
   if(host===apex&&status!==200)throw Error(target+' apex expected HTTP200');
   if(host===www&&(status!==301||location!=='https://'+apex+'/'))throw Error(target+' www canonical redirect failed');
   report.checks.push({name:host+' '+target+' HTTPS status and canonical destination',passed:true,status});
  }
 }
 report.ok=true;
}catch(error){report.error=String(error.message).slice(0,300);report.checks.push({name:'strict TLS certification',passed:false});}
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log('Independent TLS certificate matrix: '+report.checks.filter(x=>x.passed).length+'/'+report.checks.length+' passed. Evidence: '+output);
if(!report.ok)process.exitCode=1;
