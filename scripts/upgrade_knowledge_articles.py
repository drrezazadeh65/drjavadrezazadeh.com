#!/usr/bin/env python3
"""One-time idempotent upgrade of 45 published guides; never changes public URL paths.

Reads sitemap-fa.xml, preserves every paragraph and image, and adds static accessible
article TOCs, a premium content rail, related photographic cards, portable sharing,
a lightweight reading progress affordance, and Article schema consistency.
"""
from __future__ import annotations
import argparse
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITEMAP = ROOT / "sitemap-fa.xml"
DOMAIN = "https://drjavadrezazadeh.com"

def validate_slugs():
    data = SITEMAP.read_text(encoding="utf-8")
    slugs = re.findall(r"<loc>https://drjavadrezazadeh\.com/fa/rahnamaha/([a-z0-9-]+)/</loc>", data)
    if len(slugs) != 45 or len(set(slugs)) != 45:
        raise ValueError("Expected exactly 45 distinct published article slugs")
    return slugs

def upgrade(old: str, slug: str, slugs: set[str]):
    if 'knowledge-article-page' in old:
        if 'knowledge-article-layout' not in old:
            raise ValueError(f"Partially upgraded {slug}")
        return old, False, 0
    if old.count('<article class="article-shell">') != 1:
        raise ValueError(f"Article container count differs for {slug}")
    canonical = f"{DOMAIN}/fa/rahnamaha/{slug}/"
    if f'<link rel="canonical" href="{canonical}"' not in old:
        raise ValueError(f"Canonical mismatch: {slug}")
    h1_match = re.search(r'<h1\b[^>]*>(.*?)</h1>', old, re.S)
    if not h1_match:
        raise ValueError(f"Missing article H1 {slug}")
    h1_text = html.unescape(re.sub(r"<[^>]*>", "", h1_match.group(1)).strip())
    if not h1_text:
        raise ValueError(f"Empty article heading for {slug}")

    result = re.sub(
        r'<body class="([^"]+)"',
        lambda m: f'<body class="{m.group(1)} knowledge-article-page"',
        old, count=1,
    )
    figure_start = result.find('<figure class="editorial-figure">')
    figure_end = result.find('</figure>', figure_start) + len('</figure>')
    end = result.rfind('</article>')
    if figure_start < 0 or figure_end < 9 or end <= figure_end:
        raise ValueError(f"Unrecognised article figure / section boundary: {slug}")
    content = result[figure_end:end]
    headings: list[tuple[str, str]] = []

    def fix_h2(m):
        attrs, inside = m.group(1), m.group(2)
        label = html.unescape(re.sub(r'<[^>]+>', '', inside))
        label = re.sub(r'\s+', ' ', label).strip()
        if not label:
            raise ValueError(f"Empty H2 in {slug}")
        existing = re.search(r'\bid=["\x27]([^"\x27]+)["\x27]', attrs)
        ident = existing.group(1) if existing else f"ka-section-{len(headings)+1:02}"
        if ident in {h[0] for h in headings}:
            raise ValueError(f"Duplicate H2 anchor in {slug}")
        headings.append((ident, label))
        return f'<h2{attrs if existing else attrs + " id="+chr(34)+ident+chr(34)}>{inside}</h2>'

    content = re.sub(r'<h2\b([^>]*)>(.*?)</h2>', fix_h2, content, flags=re.S)
    if len(headings) < 5:
        raise ValueError(f"Insufficient section structure in {slug} ({len(headings)})")

    def photographic_link(m):
        prefix, target = m.group(1), m.group(2)
        if target not in slugs:
            return m.group(0)
        return (prefix + f'<img class="knowledge-related-thumbnail" '
                f'src="../../../assets/images/knowledge/{target}-featured.webp" '
                f'alt="" width="1600" height="900" loading="lazy" decoding="async">')

    content = re.sub(
        r'(<a\b[^>]*\bhref="\.\.\/([a-z0-9-]+)\/"[^>]*>)(?=\s*<b>)',
        photographic_link, content,
    )
    items = ''.join(f'<li><a href="#{html.escape(identifier,quote=True)}">{html.escape(label)}</a></li>'
                    for identifier, label in headings)
    links = '<ol>' + items + '</ol>'
    mobile_nav = (
        f'<details class="knowledge-article-mobiletoc"><summary>'
        f'فهرست بخش‌های مقاله ({len(headings)} بخش)</summary>'
        f'<nav aria-label="فهرست مطالب در موبایل و تبلت">{links}</nav></details>'
    )
    layout = (
        '<div class="knowledge-article-layout">'
        '<aside class="knowledge-article-sidebar">'
        '<nav class="knowledge-article-toc" aria-label="فهرست مطالب مقاله">'
        '<p class="knowledge-toc-title">در این مقاله می‌خوانید</p>'
        + links +
        '</nav><p class="knowledge-article-sidebar-note">'
        'مطالب را به‌ترتیب مطالعه کنید یا از فهرست، مستقیم به بخش دلخواه بروید.'
        ' همه پیوندها به بخش‌های همین مقاله اشاره می‌کنند.'
        '</p></aside><div class="knowledge-article-content">'
        + content + '</div></div>'
    )
    result = result[:figure_end] + mobile_nav + layout + result[end:]

    # The existing Article header remains authoritative for dates, authorship and H1.
    word_count = len(re.sub(r'<[^>]*>', ' ', content).split())
    minutes = max(2, (word_count + 189) // 190)
    minutes_fa = str(minutes).translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))
    controls = (
        '<div class="knowledge-article-tools" role="group" aria-label="ابزارهای مطالعه">'
        f'<span class="knowledge-article-reading-time">زمان تقریبی مطالعه: {minutes_fa} دقیقه</span>'
        '<button type="button" data-article-copy>کپی لینک مقاله</button>'
        '<button type="button" data-article-share>اشتراک‌گذاری</button>'
        '<span class="knowledge-article-copy-status" role="status" aria-live="polite"></span></div>'
    )
    header_end = result.index('</header>', result.index('<article class="article-shell">'))
    result = result[:header_end] + controls + result[header_end:]

    # Last stylesheet wins: existing site CSS and desktop listing are untouched.
    result = result.replace(
        '</head>',
        '<link rel="stylesheet" href="../../../assets/css/knowledge-article.css?v=20261008-premium-v1"></head>',
        1,
    )
    result = result.replace(
        '</body>',
        '<div class="knowledge-article-progress" role="progressbar" aria-label="پیشرفت مطالعه مقاله"'
        ' aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>'
        '<button type="button" class="knowledge-article-backtop" data-visible="false"'
        ' aria-label="بازگشت به ابتدای مقاله">↑</button>'
        '<script src="../../../assets/js/knowledge-article.js?v=20261008-premium-v1" defer></script></body>',
        1,
    )

    schema_count = 0
    def fix_json_ld(m):
        nonlocal schema_count
        model = json.loads(m.group(1))
        nodes = model.get('@graph', [model])
        for node in nodes:
            if node.get('@type') == 'Article':
                schema_count += 1
                node['headline'] = h1_text
                author = node.get('author')
                if author and author.get('@type') == 'Person' and not node.get('publisher'):
                    node['publisher'] = {
                        '@type': 'Person',
                        'name': author.get('name'),
                        'url': author.get('url'),
                    }
                node['isAccessibleForFree'] = True
                photo = f'{DOMAIN}/assets/images/knowledge/{slug}-featured.webp'
                if photo not in result:
                    raise ValueError(f"Unpublished featured photo reference {slug}")
                node['thumbnailUrl'] = photo
                node.setdefault('@id', canonical + '#article')
            elif node.get('@type') == 'BreadcrumbList':
                elements = node.get('itemListElement', [])
                if elements and elements[-1].get('item') == canonical:
                    elements[-1]['name'] = h1_text
        return '<script type="application/ld+json">' + json.dumps(model, ensure_ascii=False, separators=(',', ':')) + '</script>'

    result = re.sub(r'<script type="application/ld\+json">([\s\S]*?)</script>', fix_json_ld, result)
    if schema_count != 1:
        raise ValueError(f"Expected exactly one Article schema: {slug}; found {schema_count}")
    if result.count('knowledge-article-page') != 1 or result.count('knowledge-article-layout') != 1:
        raise ValueError(f"Duplicate premium article markup: {slug}")
    if len(re.findall(r'<h1\b', result)) != 1:
        raise ValueError(f"H1 was altered: {slug}")
    return result, True, len(headings)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    entries = validate_slugs()
    result = {}
    heading_count = 0
    changes = 0
    for slug in entries:
        path = ROOT / 'fa' / 'rahnamaha' / slug / 'index.html'
        source = path.read_text(encoding='utf-8')
        updated, changed, num_headings = upgrade(source, slug, set(entries))
        result[path] = updated
        changes += int(changed)
        heading_count += num_headings
    print(f'VALIDATED {len(entries)} published guide pages; new upgrades={changes}; headings={heading_count}')
    if args.check_only:
        print('CHECK ONLY: No files were modified')
        return
    for path, output in result.items():
        if path.read_text(encoding='utf-8') != output:
            path.write_text(output, encoding='utf-8')
    print(f'UPGRADED {changes} pages. No canonical paths or article bodies removed.')

if __name__ == '__main__':
    main()
