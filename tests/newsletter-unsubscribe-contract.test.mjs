import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const code=readFileSync('api/newsletter-unsubscribe.php','utf8');
const existing=readFileSync('api/newsletter-preferences.php','utf8');
const base=readFileSync('api/index.php','utf8');

test('existing newsletter router handles mail-link unsubscribe without parallel account identity',()=>{
  assert.match(base,/jrNewsletterRoute\(\$path,\$verb\)/);
  assert.match(existing,/newsletter\/unsubscribe/);
  assert.match(existing,/require_once __DIR__\.\x27\/newsletter-unsubscribe\.php\x27/);
  assert.doesNotMatch(code,/CREATE TABLE|CREATE DATABASE|DROP TABLE|ALTER TABLE/);
  assert.match(code,/eco_notification_preferences/);
  assert.match(code,/eco_consent_records/);
  assert.match(code,/eco_notifications/);
});

test('mail clients and crawlers cannot unsubscribe by visiting a GET link',()=>{
  assert.match(code,/if\(\$verb===\x27GET\x27\)jrNewsletterUnsubscribePage/);
  assert.match(code,/method="post"/);
  assert.match(code,/name="t"/);
  assert.match(code,/hash_hmac\(\x27sha256\x27,\x27newsletter-unsubscribe-v1/);
  assert.match(code,/hash_equals\(jrNewsletterUnsubscribeToken/);
  assert.match(code,/Referrer-Policy: no-referrer/);
  assert.match(code,/X-Robots-Tag: noindex/);
  assert.match(code,/Cache-Control: no-store/);
  assert.match(code,/application\/x-www-form-urlencoded/);
});

test('revocation locks consent before suppressing pending marketing messages',()=>{
  assert.match(code,/FOR UPDATE/);
  assert.match(code,/\$pdo->beginTransaction\(\)/);
  assert.match(code,/\$pdo->commit\(\)/);
  assert.match(code,/\$pdo->rollBack\(\)/);
  assert.match(code,/NEWSLETTER_EMAIL_LINK/);
  assert.match(code,/delivery_state=\x27SUPPRESSED\x27/);
  assert.match(code,/delivery_state=\x27PENDING\x27/);
  assert.match(code,/purpose_code IN \(\$placeholders\)/);
  assert.doesNotMatch(code,/sendLocalMail|smtpSend|mail\s*\(/);
  assert.doesNotMatch(code,/\bDELETE\s+FROM\b/i);
});
