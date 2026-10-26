/**
 * SOURCE-ONLY acceptance fixtures, not executed by adding this file.
 * Intentionally isolates committed-file simulations from real GSC data.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseRobots, robotsDecision, auditCommittedRobots,
  classifyReportedBlockedUrl
} from '../scripts/seo-robots-sitemap-audit.mjs';

const canonical = 'https://drjavadrezazadeh.com';

test('Googlebot uses most-specific group; wildcard is fallback', () => {
  const groups = parseRobots([
    'User-agent: *', 'Disallow: /private/',
    'User-agent: Googlebot', 'Allow: /', 'Disallow: /secret/'
  ].join('\n'));
  assert.equal(robotsDecision(groups, '/private/page/', 'Googlebot').allowed, true);
  assert.equal(robotsDecision(groups, '/secret/page/', 'Googlebot').allowed, false);
  assert.equal(robotsDecision(groups, '/private/page/', 'bingbot').allowed, false);
});

test('longest matching directive wins; Allow wins tied specificity', () => {
  const groups = parseRobots('User-agent: *\nDisallow: /en/\nAllow: /en/public/\n');
  assert.equal(robotsDecision(groups, '/en/public/item/').allowed, true);
  assert.equal(robotsDecision(groups, '/en/private/').allowed, false);
  const tied = parseRobots('User-agent: *\nDisallow: /en/\nAllow: /en/\n');
  assert.equal(robotsDecision(tied, '/en/item/').allowed, true);
});

test('existing private/login robot exclusions are not an automatic SEO defect', () => {
  const txt = 'User-agent: *\nAllow: /\nDisallow: /en/account/\n';
  const observed = classifyReportedBlockedUrl(canonical + '/en/account/', txt);
  assert.equal(observed.status, 'INTENTIONAL_PRIVATE_OR_NOINDEX_ROUTE_REVIEW');
  assert.equal(observed.proposedRobotsChange, false);
  assert.equal(observed.liveGscEvidenceVerified, false);
});

test('an actual public sitemap route blocked by robots is a regression', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'jrei-robots-'));
  try {
    fs.mkdirSync(path.join(temp, 'journal'), { recursive: true });
    fs.writeFileSync(path.join(temp, 'robots.txt'),
      'User-agent: *\nAllow: /\nDisallow: /en/\n');
    fs.writeFileSync(path.join(temp, 'sitemap.xml'),
      '<sitemapindex><sitemap><loc>' + canonical +
      '/sitemap-en.xml</loc></sitemap></sitemapindex>');
    fs.writeFileSync(path.join(temp, 'sitemap-en.xml'),
      '<urlset><url><loc>' + canonical +
      '/en/</loc></url></urlset>');
    const report = auditCommittedRobots(temp);
    assert.equal(report.pass, false);
    assert.equal(report.blockedPublicSitemapUrls.length, 1);
    assert.equal(report.productionVerified, false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('missing actual Search Console URL never authorizes global robots loosening', () => {
  assert.throws(
    () => classifyReportedBlockedUrl('https://example.net/en/', 'User-agent: *\nDisallow: /en/'),
    /GSC_HOST_MISMATCH/
  );
});
