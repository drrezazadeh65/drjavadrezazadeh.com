"""Small isolated upstream code excerpts from Aider (Apache License 2.0).

UPSTREAM: https://github.com/Aider-AI/aider
UPSTREAM_COMMIT: 5dc9490bb35f9729ef2c95d00a19ccd30c26339c
UPSTREAM_FILE: aider/coders/editblock_coder.py
COPYRIGHT: Original authors and contributors of Aider-AI/aider.
LICENSE: Apache-2.0; preserved in sibling AIDER_APACHE_LICENSE.txt.

This module contains ONLY two original pure-Python functions copied from
the upstream source. It does not import or install Aider itself, execute code,
invoke its CLI, download a model, or enable fuzzy automatic code replacement.
The JREI caller adds strict source hashes and unique-match owner review.
"""

def prep(content):
    if content and not content.endswith("\n"):
        content += "\n"
    lines = content.splitlines(keepends=True)
    return content, lines

def perfect_replace(whole_lines, part_lines, replace_lines):
    part_tup = tuple(part_lines)
    part_len = len(part_lines)

    for i in range(len(whole_lines) - part_len + 1):
        whole_tup = tuple(whole_lines[i : i + part_len])
        if part_tup == whole_tup:
            res = whole_lines[:i] + replace_lines + whole_lines[i + part_len :]
            return "".join(res)

