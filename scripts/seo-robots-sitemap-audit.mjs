/**
 * Source-only, read-only Search Console robots/sitemap consistency audit.
 * Compares committed Googlebot rules to public sitemap URLs. Does not infer
 * production robots responses or Search Console affected URL examples.
 * Never auto-unblocks routes or sends network requests.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyRoute } from '../platform/ecosystem-governance.mjs';

const ORIGIN = 'https://drjavadrezazadeh.com';
const MAX_XML_BYTES = 5_000_000;
const MAX_SITEMAPS = 40;
const MAX_URLS = 200_000;

const escapeRe = value => value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');

/** Parse user-agent groups without treating directives for one bot as global. */
export function parseRobots(text) {
  if (typeof text !== 'string' || text.length > 500_000)
    throw Error('ROBOTS_INPUT_INVALID');
  const groups = [];
  let agents = [];
  let rules = [];
  let hasDirectives = false;
  const flush = () => {
    if (agents.length) groups.push({
      agents: [...agents],
      rules: [...rules]
    });
    agents = [];
    rules = [];
    hasDirectives = false;
  };
  for (const original of text.split(/\r?\n/)) {
    const line = original.replace(/#.*$/, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      if (hasDirectives) flush();
      if (value && /^[a-z0-9*._-]{1,80}$/i.test(value))
        agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && agents.length) {
      hasDirectives = true;
      // Empty Disallow is not an effective denial.
      if (value && value.startsWith('/') && value.length <= 2048)
        rules.push({ kind: key, pattern: value });
    }
  }
  flush();
  return groups;
}

function matchRule(urlPath, rule) {
  const anchored = rule.endsWith('$');
  const raw = anchored ? rule.slice(0, -1) : rule;
  try {
    const re = new RegExp('^' + raw.split('*').map(escapeRe).join('.*') + (anchored ? '$' : ''));
    if (!re.test(urlPath)) return -1;
    // Longest effective directive wins; Allow breaks equal-specificity ties.
    return raw.replace(/\*/g, '').length;
  } catch {
    return -1;
  }
}

/**
 * Restrict selection to a named crawler's most-specific robots group.
 * All rules of equally specific repeated groups are combined.
 */
export function robotsDecision(groups, pathname, crawler = 'Googlebot') {
  if (!Array.isArray(groups) || typeof pathname !== 'string' ||
      !pathname.startsWith('/') || pathname.length > 4096 ||
      typeof crawler !== 'string')
    throw Error('ROBOTS_DECISION_INPUT_INVALID');
  const name = crawler.toLowerCase();
  let bestAgentLength = -1;
  let selected = [];
  for (const group of groups) {
    for (const agent of group.agents || []) {
      const specificity = agent === '*' ? 0 : (name.startsWith(agent) ? agent.length : -1);
      if (specificity < 0) continue;
      if (specificity > bestAgentLength) {
        bestAgentLength = specificity;
        selected = [group];
      } else if (specificity === bestAgentLength && !selected.includes(group)) {
        selected.push(group);
      }
    }
  }
  let winner = null;
  for (const group of selected) {
    for (const rule of group.rules) {
      const length = matchRule(pathname, rule.pattern);
      if (length < 0) continue;
      if (!winner || length > winner.length ||
          (length === winner.length && rule.kind === 'allow' && winner.kind !== 'allow'))
        winner = { length, kind: rule.kind, pattern: rule.pattern };
    }
  }
  return Object.freeze({
    allowed: winner?.kind !== 'disallow',
    matched: winner ? { kind: winner.kind, pattern: winner.pattern } : null,
    groupSpecificity: bestAgentLength
  });
}

function xmlLocs(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > MAX_XML_BYTES)
    throw Error('SITEMAP_XML_INVALID');
  return [...text.matchAll(/<loc\b[^>]*>\s*([^<]+?)\s*<\/loc>/gi)]
    .map(match => match[1].replaceAll('&amp;', '&').trim());
}

function sitemapPath(root, uri) {
  let url;
  try { url = new URL(uri); } catch { throw Error('SITEMAP_LOCATION_INVALID'); }
  if (url.origin !== ORIGIN || url.search || url.hash ||
      !/^\/[a-zA-Z0-9._/-]+\.xml$/.test(url.pathname) ||
      url.pathname.split('/').includes('..'))
    throw Error('SITEMAP_LOCATION_UNTRUSTED');
  const rel = url.pathname.slice(1);
  const full = path.resolve(root, rel);
  if (!full.startsWith(path.resolve(root) + path.sep))
    throw Error('SITEMAP_TRAVERSAL_BLOCKED');
  return full;
}

function readXml(filepath) {
  const info = fs.statSync(filepath);
  if (info.size > MAX_XML_BYTES) throw Error('SITEMAP_TOO_LARGE');
  return fs.readFileSync(filepath, 'utf8');
}

/** An offline deterministic audit. No network and no private data. */
export function auditCommittedRobots(root = process.cwd()) {
  const groups = parseRobots(fs.readFileSync(path.join(root, 'robots.txt'), 'utf8'));
  const index = readXml(path.join(root, 'sitemap.xml'));
  if (!/<sitemapindex\b/i.test(index)) throw Error('ROOT_SITEMAP_NOT_INDEX');
  const childLocs = xmlLocs(index);
  if (childLocs.length < 1 || childLocs.length > MAX_SITEMAPS)
    throw Error('SITEMAP_CHILD_COUNT_INVALID');

  const unique = new Set();
  const blocked = [];
  const errors = [];
  for (const child of childLocs) {
    const xml = readXml(sitemapPath(root, child));
    if (!/<urlset\b/i.test(xml)) {
      errors.push({ type: 'CHILD_SITEMAP_NOT_URLSET', child });
      continue;
    }
    for (const raw of xmlLocs(xml)) {
      if (unique.size >= MAX_URLS) throw Error('SITEMAP_URL_LIMIT_EXCEEDED');
      let url;
      try { url = new URL(raw); } catch {
        errors.push({ type: 'SITEMAP_URL_INVALID', url: raw }); continue;
      }
      if (url.origin !== ORIGIN || url.username || url.password) {
        errors.push({ type: 'SITEMAP_URL_OUTSIDE_CANONICAL_HOST', url: raw }); continue;
      }
      if (unique.has(url.href)) continue;
      unique.add(url.href);
      const decision = robotsDecision(groups, url.pathname, 'Googlebot');
      if (!decision.allowed) {
        blocked.push({
          url: url.href,
          rule: decision.matched?.pattern ?? null,
          routePolicy: classifyRoute(url.pathname).policy
        });
      }
    }
  }
  return Object.freeze({
    schema: 'jr.seo.robots-sitemap-static-audit.v1',
    evidence: 'COMMITTED_FILES_ONLY_NOT_LIVE_GSC',
    crawler: 'Googlebot',
    sitemapUrlsChecked: unique.size,
    blockedPublicSitemapUrls: blocked,
    structuralErrors: errors,
    pass: blocked.length === 0 && errors.length === 0,
    productionVerified: false,
    searchConsoleIssueResolved: false
  });
}

/** Classify a URL actually exported from GSC; do NOT guess from an alert email. */
export function classifyReportedBlockedUrl(urlString, robotsText, sitemapUrls = []) {
  if (typeof urlString !== 'string' || urlString.length > 4096 ||
      !Array.isArray(sitemapUrls)) throw Error('GSC_INPUT_INVALID');
  const url = new URL(urlString);
  if (url.origin !== ORIGIN) throw Error('GSC_HOST_MISMATCH');
  const decision = robotsDecision(parseRobots(robotsText), url.pathname, 'Googlebot');
  const policy = classifyRoute(url.pathname);
  let status = 'NOT_BLOCKED_BY_COMMITTED_ROBOTS';
  if (!decision.allowed) {
    status = sitemapUrls.includes(url.href)
      ? 'PUBLIC_SITEMAP_ROBOTS_CONFLICT'
      : policy.indexing === 'NOINDEX'
        ? 'INTENTIONAL_PRIVATE_OR_NOINDEX_ROUTE_REVIEW'
        : 'BLOCKED_URL_REQUIRES_CANONICAL_REVIEW';
  }
  return Object.freeze({
    url: url.href, status, routePolicy: policy.policy,
    committedRule: decision.matched?.pattern ?? null,
    liveGscEvidenceVerified: false,
    proposedRobotsChange: false
  });
}

const mainPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (mainPath === fileURLToPath(import.meta.url)) {
  try {
    const result = auditCommittedRobots();
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (!result.pass) process.exitCode = 1;
  } catch (error) {
    process.stderr.write('ROBOTS_STATIC_AUDIT_FAILED: ' + String(error.message) + '\n');
    process.exitCode = 1;
  }
}
