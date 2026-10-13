#!/usr/bin/env python3
"""Verify unpublished Golden Talent manuscript question banks offline.

Usage:
 python scripts/golden-talent-manuscript-audit.py --docx /private/manuscript.docx --crosswalk platform/golden-talent-book-crosswalk.v1.json

Never uploads, saves, exports or prints questionnaire stems. Matching fingerprints
are evidence of fidelity to one working version, not psychometric validation.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import unicodedata
import zipfile
from xml.etree import ElementTree

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
CORE = re.compile(r'^([A-G][1-4])\s*\|\s*([BC])\s+(.+)$')
DEEP = re.compile(r'^(D[1-6]\.\d{2})\s*\|\s*(.+)$')
EXPECTED = {'D1': 24, 'D2': 24, 'D3': 24, 'D4': 22, 'D5': 28, 'D6': 20}


def normalized(text):
    return ' '.join(unicodedata.normalize('NFC', text).split())


def paragraphs(docx):
    with zipfile.ZipFile(docx) as archive:
        root = ElementTree.fromstring(archive.read('word/document.xml'))
    body = root.find(W + 'body')
    if body is None:
        raise ValueError('DOCX has no document body')
    for paragraph in body.findall(W + 'p'):
        value = ''.join(t.text or '' for t in paragraph.iter(W + 't')).strip()
        if value:
            yield value


def digest(rows):
    lines = ['|'.join(normalized(part) for part in row) for row in rows]
    return hashlib.sha256('\n'.join(lines).encode('utf-8')).hexdigest()


def audit(docx, crosswalk):
    lines = list(paragraphs(docx))
    core, modules = [], {d: [] for d in EXPECTED}
    for position, line in enumerate(lines):
        match = CORE.fullmatch(line)
        if match:
            core.append(match.groups())
        match = DEEP.fullmatch(line)
        if match:
            if position + 1 >= len(lines):
                raise ValueError('Deep module item has no following prompt')
            code, response = match.groups()
            modules[code.split('.')[0]].append((code, response, lines[position + 1]))
    problems = []
    expected_core = [f'{g}{i}' for g in 'ABCDEFG' for i in range(1, 5)]
    if [row[0] for row in core] != expected_core:
        problems.append('Core identifiers or order differ')
    core_hash = digest(core)
    if core_hash != crosswalk['rcas']['C1']['book_wording_sha256']:
        problems.append('Core content fingerprint differs')
    output = {
        'core': {'items': len(core), 'sha256': core_hash,
                 'matches_baseline': not any(p.startswith('Core') for p in problems)},
        'modules': {}
    }
    baselines = {m['code']: m for m in crosswalk['deep_modules']['bank_inventory']}
    for module, count in EXPECTED.items():
        rows = modules[module]
        expected_ids = [f'{module}.{i:02d}' for i in range(1, count + 1)]
        if [row[0] for row in rows] != expected_ids:
            problems.append(module + ': identifiers or order differ')
        h = digest(rows)
        matched = h == baselines[module]['working_manuscript_bank_sha256']
        if not matched or len(rows) != count or baselines[module]['bank_count'] != count:
            problems.append(module + ': content fingerprint or count differs')
        output['modules'][module] = {'items': len(rows), 'sha256': h,
                                      'matches_baseline': matched}
    output['total_items'] = len(core) + sum(len(rows) for rows in modules.values())
    output['passed'] = not problems
    output['errors'] = problems
    output['policy'] = 'Text fidelity only; no score, diagnosis or psychometric validation.'
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--docx', type=Path, required=True)
    parser.add_argument('--crosswalk', type=Path, required=True)
    args = parser.parse_args()
    try:
        data = json.loads(args.crosswalk.read_text(encoding='utf-8'))
        result = audit(args.docx, data)
    except (ValueError, KeyError, OSError, zipfile.BadZipFile, ElementTree.ParseError) as exc:
        print(json.dumps({'passed': False, 'error': type(exc).__name__}))
        return 2
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    sys.exit(main())
