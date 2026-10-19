import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {observeJhelaHostRedirect,journalPublicTlsSignal} from '../scripts/lib/jhela-native-host-acceptance.mjs';

test('native JHELA bridge recognises a CA-trusted canonical HTTPS redirect but never claims manuscript readiness',()=>{
 for(const status of [301,302,307,308]){
  const r=observeJhelaHostRedirect({httpStatus:status,location:'https://drjavadrezazadeh.com/journal/'});
  assert.equal(r.status,'LIVE_TLS_CANONICAL_BRIDGE');
  assert.equal(r.canonicalDestination,'https://drjavadrezazadeh.com/journal/');
  assert.equal(r.trustedTlsHandshake,true);
  assert.equal(r.nativeEditorialSubmissionVerified,false);
  assert.equal(r.privateManuscriptStorageVerified,false);
  assert.equal(r.independentPeerReviewVerified,false);
  assert.equal(r.journalArticlePublicationVerified,false);
  assert.equal(journalPublicTlsSignal({name:'jhela-native-subdomain-tls',...r}),true);
 }
});

test('native journal observer rejects deceptive redirects and unverified 200 pages',()=>{
 const unsafe=[
  [302,'http://drjavadrezazadeh.com/journal/'],
  [302,'https://drjavadrezazadeh.com.evil.invalid/journal/'],
  [302,'https://example.org/journal/'],
  [302,'https://drjavadrezazadeh.com/journal/?email=private'],
  [302,'https://drjavadrezazadeh.com/journal/#token'],
  [302,'https://journal.drjavadrezazadeh.com/'],
  [301,'https://drjavadrezazadeh.com/journal/articles/'],
  [302,'https://drjavadrezazadeh.com:444/journal/'],
  [302,'https://guest:pass@drjavadrezazadeh.com/journal/'],
  [302,'//evil.example/journal/'],
  [302,''],
  [200,'https://drjavadrezazadeh.com/journal/'],
  [404,'https://drjavadrezazadeh.com/journal/']
 ];
 for(const [status,location] of unsafe){
  const r=observeJhelaHostRedirect({httpStatus:status,location});
  assert.equal(r.canonicalJournalRedirectVerified,false,status+' '+location);
  assert.equal(r.status,'HOST_ROUTE_UNVERIFIED');
  assert.equal(r.nativeEditorialSubmissionVerified,false);
  assert.equal(journalPublicTlsSignal({name:'jhela-native-subdomain-tls',...r}),false);
 }
});

test('release observer no longer exposes retired vendor integration in active status signals',()=>{
 const files=[
  fs.readFileSync('scripts/bertina-postrelease-check.mjs','utf8'),
  fs.readFileSync('scripts/lib/public-release-acceptance.mjs','utf8')
 ];
 for(const s of files){
  assert.doesNotMatch(s,/jhela-ojs-subdomain-tls|ojsEditorialE2EVerified|installedOjsOrPrivateUploadsVerified/);
  assert.match(s,/jhela-native-subdomain-tls/);
 }
});

test('JHELA journal host observation is read-only and intentionally outside full scientific certification',()=>{
 const src=fs.readFileSync('scripts/lib/public-release-acceptance.mjs','utf8');
 assert.match(src,/nativeJournalEditorialE2EVerified:false/);
 assert.match(src,/fullMasterplanCertified:false/);
 const observer=fs.readFileSync('scripts/bertina-postrelease-check.mjs','utf8');
 assert.match(observer,/method:'GET',redirect:'manual',cache:'no-store'/);
 assert.doesNotMatch(observer,/submit.*manuscript|multipart\/form-data/);
});
