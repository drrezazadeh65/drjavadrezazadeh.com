import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('one pre-existing server identity and verified same-origin community gate protects all mutations',()=>{
 const php=read('api/community.php');
 assert.match(php,/function communityAvailable\(PDO \$pdo\)/);
 for(const table of ['community_comments','community_moderation_audit','community_admin_replies','community_admin_reply_revisions','community_erasure_audit'])
  assert.ok(php.includes("SELECT id FROM "+table+" LIMIT 0"),table);
 for(const token of ["getenv('JR_COMMUNITY_ENABLED') !== 'true'","getenv('JR_COMMUNITY_MIGRATION_APPROVED') !== 'true'",
  'communityMutationGuard($pdo)','communityModerator($pdo)','operationsMfaFresh(','HTTP_ORIGIN','HTTP_SEC_FETCH_SITE',
  'HTTP_X_JR_COMMUNITY_CSRF','hash_equals','sessionAccount($pdo)'])
  assert.ok(php.includes(token),token);
 assert.match(php,/function communityCanErase\(array \$account\): bool/);
 assert.match(php,/SUPER_ADMIN/);
 assert.match(php,/if \(!communityCanErase\(\$actor\)\) fail\('super_admin_required',403\)/);
});
test('publicly observable comments and official replies are both independently publication-gated',()=>{
 const php=read('api/community.php');
 const publicCode=php.slice(php.indexOf("if ($route==='/community/comments' && $verb==='GET')"),
   php.indexOf("if ($route==='/community/csrf' && $verb==='GET')"));
 assert.match(publicCode,/state='approved'/);
 assert.match(publicCode,/communityListApprovedReplies\(\$pdo,\$approved\)/);
 assert.match(php,/r\.state='published' AND r\.comment_id IN/);
 assert.match(php,/c\.id=r\.comment_id AND c\.state='approved'/);
 assert.match(php,/ORDER BY r\.created_at ASC,r\.id ASC/);
 assert.doesNotMatch(publicCode,/email_normalized|mobile_e164|author_account_id/);
 assert.doesNotMatch(php,/aggregateRating|ReviewCount|JSON-LD|schema\.org\/Review/);
 assert.match(php,/comment_not_approved',409/);
 assert.match(php,/VALUES\(\?,\?,\?,\?,'draft',1,\?,\?\)/);
 assert.match(php,/communityAdminReplyRevision\(\$pdo,\$id,1,\$actorId,'created','draft'/);
});
test('all owner operations require explicit version-safe transitions and content-free erasure audit',()=>{
 const php=read('api/community.php');
 for(const route of ["/community/admin/replies","/community/admin/revisions","/community/admin/erase"])
  assert.ok(php.includes(route));
 assert.match(php,/function communityAdminReplyRow/);
 assert.match(php,/FOR UPDATE/);
 assert.match(php,/revision_no=\?/);
 assert.match(php,/reply_version_conflict',409/);
 assert.match(php,/community_admin_reply_revisions/);
 assert.match(php,/community_erasure_audit/);
 assert.match(php,/confirmation'\]\?\?null\)!=='ERASE'/);
 assert.match(php,/erasure_requires_removal',409/);
 assert.match(php,/DELETE FROM \$table WHERE id=\?/);
 assert.match(php,/rateAllowed\(\$pdo,'community_admin_erase'/);
 assert.match(php,/rateAllowed\(\$pdo,'community_admin_reply'/);
});
test('historical comments are keyset-paged privately, with bounded fetch and explicit states',()=>{
 const php=read('api/community.php');
 assert.match(php,/function communityArchivePage/);
 assert.match(php,/LIMIT 21/);
 assert.match(php,/array_slice\(\$all,0,20\)/);
 assert.match(php,/created_at < \?/);
 assert.match(php,/created_at = \? AND id < \?/);
 assert.match(php,/ORDER BY created_at DESC,id DESC/);
 assert.match(php,/beforeCreatedAt/);
 assert.match(php,/beforeId/);
 assert.match(php,/communityModerator\(\$pdo\)/);
});
test('anti-spam includes verified identity, CSRF, frequency, trap and link volume without leaking errors',()=>{
 const php=read('api/community.php');
 assert.match(php,/consentToPublication/);
 assert.match(php,/rateAllowed\(\$pdo,'community_comment',\$id,3,3600\)/);
 assert.match(php,/pageBody\['website'\]/);
 assert.match(php,/trim\(\$trap\)!==''/);
 assert.match(php,/preg_match_all/);
 assert.match(php,/>3\) fail\('invalid_comment',400\)/);
 assert.match(php,/textLen\(\$content\)<12/);
 assert.match(php,/textLen\(\$content\)>2000/);
});
test('owner-observed five-table schema contract exists exclusively as fixture, not automatic production migration',()=>{
 const sql=read('database/bertina/022_community_academic_replies_owner_applied.sql');
 const tables=['community_admin_replies','community_admin_reply_revisions','community_erasure_audit'];
 for(const name of tables)assert.match(sql,new RegExp('CREATE TABLE '+name+' \\('));
 assert.match(sql,/DO NOT RE-RUN against drjavad1_store/);
 assert.match(sql,/DEFAULT 'draft'/);
 assert.match(sql,/CHECK \(state <> 'published' OR published_at IS NOT NULL\)/);
 assert.match(sql,/UNIQUE KEY uq_jr_reply_revision/);
 assert.match(sql,/REFERENCES community_comments\(id\) ON DELETE CASCADE/);
 assert.doesNotMatch(sql,/^\s*(?:CREATE DATABASE|DROP TABLE|ALTER TABLE|DELETE FROM|TRUNCATE TABLE)\b/im);
 const wf=read('.github/workflows/community-moderation-database-gate.yml');
 assert.match(wf,/mysql .*community_fixture < database\/bertina\/021_community_moderation.sql/);
 assert.match(wf,/mysql .*community_fixture < database\/bertina\/022_community_academic_replies_owner_applied.sql/);
 assert.match(wf,/node --test tests\/community-moderation.test.mjs tests\/community-design-consistency.test.mjs tests\/community-academic-replies.test.mjs/);
 assert.doesNotMatch(wf,/deploy-bertina\.yml|JR_COMMUNITY_ENABLED=true/);
});
test('academic brand, native accessible accordions, revision controls and SUPER_ADMIN erasure are inherited not duplicated',()=>{
 const pub=read('assets/js/community-comments.js');
 const admin=read('assets/js/operations-community-moderation.js');
 const publicCss=read('assets/css/community-comments.css');
 const privateCss=read('assets/css/operations-community-moderation.css');
 assert.match(pub,/el\('details','jr-community-comment'\)/);
 assert.match(pub,/el\('summary','jr-community-comment-meta'/);
 assert.match(pub,/jr-community-official-replies/);
 assert.match(pub,/jr-community-official-label/);
 assert.match(pub,/formPanel\.hidden=true/);
 assert.match(pub,/formPanel\.hidden=false/);
 assert.match(pub,/n\.textContent=content/);
 assert.match(pub,/honeypotInput\.name='website'/);
 assert.match(admin,/elt\('details','jr-community-admin-item'\)/);
 assert.match(admin,/id='jr-community-admin-heading'|heading\.id='jr-community-admin-heading'/);
 assert.match(admin,/workspace\.hidden\?lock\(\):load\(\)/);
 assert.match(admin,/canErase=body\.canErase===true/);
 assert.match(admin,/community\/admin\/replies/);
 assert.match(admin,/community\/admin\/revisions/);
 assert.match(admin,/community\/admin\/erase/);
 assert.match(admin,/ERASE/);
 assert.match(admin,/new URLSearchParams/);
 assert.match(admin,/textContent=content/);
 assert.match(publicCss,/jr-community-official-reply/);
 assert.match(privateCss,/jr-community-admin-replies-panel/);
 for(const css of [publicCss,privateCss]){
  assert.match(css,/@media\(max-width:/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/@media\(forced-colors:active\)/);
 }
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(p);
  assert.match(html,/id="ops-workspace" hidden/);
  assert.match(html,/id="ops-mfa-form"/);
  assert.match(html,/operations-community-moderation\.js\?v=20261021-academic-v2/);
  assert.match(html,/operations-community-moderation\.css\?v=20261021-academic-v2/);
 }
 assert.match(read('assets/js/site-extras.js'),/community-comments\.js\?v=20261026-community-r3/);
 assert.match(pub,/community-comments\.css\?v=20261026-community-r3/);
 assert.match(pub,/community-comments\.css\?v=20261026-community-r3/);
});
test('public reply result caps preserve approved-only publication and bounded memory',()=>{
 const php=read('api/community.php');
 const begin=php.indexOf('function communityListApprovedReplies(');
 const end=php.indexOf('function communityAdminReplyRow(',begin);
 const onlyPublic=php.slice(begin,end);
 assert.match(onlyPublic,/ORDER BY r\.created_at ASC,r\.id ASC LIMIT 300/);
 assert.match(onlyPublic,/count\(\$out\[\$parent\]\?\?\[\]\)>=15/);
 assert.match(onlyPublic,/r\.state='published'/);
 assert.match(onlyPublic,/c\.state='approved'/);
 assert.doesNotMatch(onlyPublic,/body_snapshot|email_normalized|author_account_id/);
});
test('administrator relock guard stops CSRF races before a mutation is sent',()=>{
 const js=read('assets/js/operations-community-moderation.js');
 assert.match(js,/const active=generation;\s*const r=await json\('\/api\/community\/csrf'\)/);
 assert.match(js,/if\(workspace\.hidden\|\|active!==generation\)throw Error\('locked'\)/);
 assert.match(js,/const key=await token\(\);\s*if\(workspace\.hidden\)throw Error\('locked'\)/);
});
test('reader rating summary counts only fully approved valid votes across the complete page, not a display limit',()=>{
 const php=read('api/community.php');
 assert.match(php,/COUNT\(\*\) AS n,AVG\(rating\) AS mean_value/);
 assert.match(php,/page_path=\? AND state='approved' AND rating BETWEEN 1 AND 5/);
 assert.match(php,/ratingSummary/);
 assert.doesNotMatch(php,/schema\.org\/Review|aggregateRating|ReviewCount/);
 const ui=read('assets/js/community-comments.js');
 assert.match(ui,/Number\.isInteger\(count\)/);
 assert.match(ui,/ratingSummary\.hidden=false/);
 assert.match(ui,/ratingSummary\.textContent=/);
 assert.doesNotMatch(ui,/JSON-LD|aggregateRating|ReviewCount/);
});
test('approved-only public pagination remains bounded and leaves rating aggregation independent',()=>{
 const php=read('api/community.php');
 const ui=read('assets/js/community-comments.js');
 assert.match(php,/ORDER BY created_at DESC,id DESC LIMIT 21/);
 assert.match(php,/nextCursor/);
 assert.match(php,/validUuid\(\$rawId\)/);
 assert.match(php,/state='approved'/);
 assert.match(ui,/const renderComments=/);
 assert.match(ui,/beforeCreatedAt=/);
 assert.match(ui,/more\.hidden=!nextCursor/);
 assert.match(ui,/Submitted for moderation/);
});