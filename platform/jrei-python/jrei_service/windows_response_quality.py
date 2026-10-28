"""Bounded local-generation quality checks for JREI Windows.

This is a deterministic *negative* screen for obvious repetition loops, not
a proof of factual accuracy or scientific validity. No network or model runs.
It does not rewrite user text, delete valid history or execute generated code.
"""
from __future__ import annotations

from collections import Counter
import re


def has_repetition_loop(answer: str) -> bool:
    """Flag pathological repeated output while allowing ordinary long answers."""
    if not isinstance(answer, str):
        return True
    words = re.findall(r"[^\W_]+", answer.casefold(), flags=re.UNICODE)
    if len(words) < 30:
        return False

    # Consecutive single-word loops, including repeated tokens separated by
    # punctuation such as "dlls, dlls, dlls". Ignore how punctuation is spaced.
    last = ""
    run = 0
    for word in words:
        run = run + 1 if word == last else 1
        if run >= 9:
            return True
        last = word

    # Reject an overwhelming single-word tail but not ordinary repetitions of
    # common function words in longer Persian or English paragraphs.
    tail = words[-min(90, len(words)):]
    if len(tail) >= 48:
        token, count = Counter(tail).most_common(1)[0]
        if count >= 25 and count / len(tail) >= 0.43 and len(token) >= 3:
            return True

    # Identify a short n-gram repeated consecutively, where no one word alone
    # is dominant, e.g. "a b c a b c a b c ..." in an otherwise valid answer.
    for size in range(2, 9):
        repeats = 6 if size == 2 else 4
        span = size * repeats
        if len(words) < span:
            continue
        for i in range(len(words) - span + 1):
            unit = words[i:i + size]
            if words[i:i + span] == unit * repeats:
                return True

    return False
