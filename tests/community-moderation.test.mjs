import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const php=()=>read('api/community.php');

test('comment platform is disabled unless two independent operator flags are set',()=>{
 const s=php();
 assert.match(s,/getenv\('JR_COMMUNITY_ENABLED'\) !== 'true'/);
 assert.match(s,/getenv\('JR_COMMUNITY_MIGRATION_APPROVED'\) !== 'true'/);
 assert.match(s,/if \(!\$pdo \|\| !communityAvailable\(\$pdo\)\) fail\('community_unavailable',503\)/);
 assert.match(s,/BERTINA_API_BOOTSTRAPPED/);
 assert.match(read('api/index.php'),/if \(str_starts_with\(\$path, '\/community\/'\)\) \{ require_once __DIR__\.'\/community\.php'; communityRoute\(\$path,\$verb\); \}/);
});
test('only previously verified accounts can submit, with origin, CSRF and rate limits',()=>{
 const s=php();
 for(const rule of ['sessionAccount($pdo)',"email_verified_at","HTTP_ORIGIN","HTTP_SEC_FETCH_SITE","HTTP_X_JR_COMMUNITY_CSRF","hash_equals","rateAllowed($pdo,'community_comment'","textLen($content)<12","textLen($content)>2000"])
  assert.ok(s.includes(rule),'Missing '+rule);
 assert.match(s,/VALUES\(\?,\?,\?,\?,\?,'pending',\?,\?\)/);
 assert.match(s,/consentToPublication/);
 assert.match(s,/consented_at/);
 assert.match(s,/status.*'pending'|state.*'pending'/);
 assert.match(s,/return \$v;/);
});
test('public page selection permits existing Persian articles, plus explicitly flagged catalogued public services',()=>{
 const s=php();
 assert.match(s,/function communityCanonical/);
 assert.ok(s.includes("preg_match('#^/fa/(akhbar|rahnamaha)/"),'existing Persian article directories retained');
  assert.ok(s.includes("$root=realpath(dirname(__DIR__).'/fa/'.$matches[1]);"),'checked public directory only');
  assert.ok(s.includes("$article=$root ? realpath($root.'/'.$matches[2].'/index.html') : false;"),'existing canonical article required');
 assert.match(s,/str_starts_with\(\$article,\$root\.DIRECTORY_SEPARATOR\)/);
 assert.doesNotMatch(s,/file_get_contents\(\$v\)/);
});
test('unapproved comments and ratings never appear in public output',()=>{
 const s=php();
 const start=s.indexOf("if ($route==='/community/comments' && $verb==='GET')");
 const end=s.indexOf("if ($route==='/community/csrf'",start);
 assert.ok(start>0&&end>start);
 const p=s.slice(start,end);
 assert.match(p,/state='approved'/);
 assert.doesNotMatch(p,/email_normalized|author_account_id|mobile_e164/);
 assert.match(p,/Verified reader/);
 assert.doesNotMatch(s,/aggregateRating|ReviewCount|JSON-LD/);
});
test('moderation is controlled by administrator membership, fresh MFA and audit records',()=>{
 const s=php();
 assert.match(s,/operationsAdmin\(\$pdo,\$account,\$settings\)/);
 assert.match(s,/operationsMfaFresh\(\$pdo,\$session,\$accountId,nowTs\(\),\$credentialHash\)/);
 assert.match(s,/communityMutationGuard\(\$pdo\)/);
 assert.match(s,/WHERE id=\? AND state=\?/);
 assert.match(s,/\$expectedState=\$decision==='removed'\?'approved':'pending'/);
 assert.match(s,/community_moderation_audit/);
 assert.match(s,/in_array\(\$decision,\['approved','rejected','removed'\],true\)/);
 assert.match(s,/rateAllowed\(\$pdo,'community_moderation'/);
});
test('MySQL migrations are additive, default pending and ratings bounded',()=>{
 const sql=read('database/bertina/021_community_moderation.sql');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS community_comments/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS community_moderation_audit/);
 assert.match(sql,/state ENUM\('pending','approved','rejected','removed'\) NOT NULL DEFAULT 'pending'/);
 assert.match(sql,/UNIQUE KEY uq_community_one_review_per_account_page/);
 assert.match(sql,/REFERENCES customer_accounts\(id\)/);
 assert.match(sql,/CHECK \(rating IS NULL OR \(rating BETWEEN 1 AND 5\)\)/);
 assert.doesNotMatch(sql,/DROP TABLE|ALTER TABLE customer_accounts|TRUNCATE|DELETE FROM/i);
});
test('user text is output via textContent, not HTML, and widget hides on disabled backend',()=>{
 const js=read('assets/js/community-comments.js');
 assert.match(js,/result\.body\?\.schema!=='community-comments-v1'/);
 assert.match(js,/host\.remove\(\)/);
 assert.match(js,/n\.textContent=content/);
 assert.doesNotMatch(js,/innerHTML\s*=\s*[^;]*(?:\.body|\.message|c\.body)/);
 assert.match(js,/state==='pending'/);
 assert.match(js,/name="consent" required/);
 assert.match(js,/consentToPublication/);
 assert.match(js,/harim-khosusi/);
 const loader=read('assets/js/site-extras.js');
 assert.match(loader,/community-comments\.js/);
 assert.match(js,/community-comments\.css/);
 assert.match(loader,/data-jr-community-loader/);
});
test('both administrator dashboards retain MFA and existing journal features',()=>{
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const h=read(p);
  assert.match(h,/id="ops-workspace" hidden/);
  assert.match(h,/id="ops-mfa-form"/);
  assert.match(h,/operations-jhela-workstream\.js/);
  assert.match(h,/operations-community-moderation\.js/);
  assert.match(h,/operations-community-moderation\.css/);
 }
 const ui=read('assets/js/operations-community-moderation.js');
 assert.match(ui,/if\(workspace\.hidden\)\{lock\(\);return;\}/);
 assert.match(ui,/workspace\.hidden\?lock\(\):load\(\)/);
 assert.match(ui,/kind==='approved'/);
 assert.match(ui,/\['removed'/);
 assert.doesNotMatch(ui,/document\.write/);
});

test('bilingual service questions remain behind a THIRD flag and only allow catalogued public service pages without unverified stars',()=>{
 const s=php();
 assert.match(s,/getenv\('JR_COMMUNITY_SERVICES_ENABLED'\) !== 'true'/);
 assert.match(s,/^.*preg_match\('#\^\/\(fa\|en\)\/services\//m);
 assert.match(s,/service-catalog\.json/);
 assert.match(s,/\$item\['sellable'\]\?\?false/);
 assert.match(s,/service_ratings_not_verified',400/);
 assert.match(s,/if \(!\$root \|\| !\$page \|\| !str_starts_with/);
 assert.match(s,/str_starts_with\(\$page,\$root\.DIRECTORY_SEPARATOR\)/);
});

test('optional article-only stars use existing moderated table and do not fabricate written commentary',()=>{
 const server=php();
 const client=read('assets/js/community-comments.js');
 const moderator=read('assets/js/operations-community-moderation.js');
 assert.match(server,/\$ratingOnly=\$rating!==null && \$content===''/);
 assert.match(server,/!\$ratingOnly && \(textLen\(\$content\)<12/);
 assert.match(server,/service_ratings_not_verified/);
 assert.match(server,/UNIQUE KEY|community_moderation_audit/);
 assert.match(client,/rating===null/);
 assert.match(client,/Approved reader rating/);
 assert.match(client,/value\?tr\(/);
 assert.match(moderator,/Rating submitted without written commentary/);
 const sql=read('database/bertina/021_community_moderation.sql');
 assert.match(sql,/body_text TEXT NOT NULL/);
 assert.match(sql,/uq_community_one_review_per_account_page/);
});
