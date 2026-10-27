"""Conservative model-independent quarantine of instruction-like source text.

Retrieved books, websites, news, search results and academic articles may
contain adversarial commands. These indicators help REMOVE unsafe evidence
from model-context proposals; a false negative is NOT a safety clearance.
This is not a licensing, plagiarism, PII or scientific-quality classifier.
No text is executed, fetched or stored by this module.
"""
from __future__ import annotations

import re
import unicodedata

_RULES: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("ROLE_SPOOF", re.compile(
        r"(?:\b(?:system|developer|assistant)\s*[:：]\s*|"
        r"\[(?:/?)(?:inst|system|assistant)\]|"
        r"<\|(?:system|assistant|im_start|im_end)\|>)",
        flags=re.IGNORECASE)),
    ("OVERRIDE_INSTRUCTIONS", re.compile(
        r"(?:ignore|disregard|override|forget)\s+(?:(?:all|any|the|your)\s+)?"
        r"(?:previous|above|prior|system|developer)\s+"
        r"(?:instruction|instruction[s]?|prompt|rule[s]?)",
        flags=re.IGNORECASE)),
    ("UNTRUSTED_SECRET_REQUEST", re.compile(
        r"(?:reveal|print|dump|exfiltrate|send)\s+(?:your\s+|the\s+)?"
        r"(?:api\s*key|private\s*key|password|secret|system\s*prompt|credential)",
        flags=re.IGNORECASE)),
    ("UNTRUSTED_CODE_EXECUTION", re.compile(
        r"(?:run|execute|start)\s+(?:this\s+|the\s+)?"
        r"(?:powershell|cmd(?:\.exe)?|bash|terminal|shell|sql\s+command)",
        flags=re.IGNORECASE)),
    ("FA_ROLE_OR_OVERRIDE", re.compile(
        r"(?:دستور(?:های)?\s+(?:قبلی|بالا|سیستم)\s+را\s+نادیده\s+بگیر|"
        r"قوانین\s+(?:امنیتی|سیستم)\s+را\s+(?:دور\s+بزن|لغو\s+کن)|"
        r"کلید(?:های)?\s+(?:محرمانه|خصوصی)\s+را\s+(?:نمایش\s+بده|ارسال\s+کن))")),
    ("FA_EXECUTION_REQUEST", re.compile(
        r"(?:پاورشل|ترمینال|شل)\s+را\s+اجرا\s+کن|"
        r"دستور\s+(?:مخرب|سیستمی)\s+را\s+اجرا\s+کن")),
)
_CONTROL = frozenset({chr(n) for n in (
    0x061C, 0x200B, 0x200C, 0x200D, 0x202A, 0x202B, 0x202D, 0x202E,
    0x2066, 0x2067, 0x2068, 0x2069, 0xFEFF
)})


def source_text_hold_reasons(text: str) -> tuple[str, ...]:
    """Return deterministic risk signals, never a claim of verified safety.

    A document ABOUT prompt injection can legitimately trigger a hold; an
    independently authorised reviewer must decide the scientific relevance.
    """
    if not isinstance(text, str) or len(text) > 16_384:
        return ("SOURCE_TEXT_TYPE_OR_SIZE_INVALID",)
    reasons: set[str] = set()
    if any(char in _CONTROL for char in text):
        reasons.add("HIDDEN_BIDI_OR_FORMAT_CONTROL_IN_SOURCE")
    normalized = unicodedata.normalize("NFKC", text)
    normalized = normalized.replace("ي", "ی").replace("ك", "ک")
    # One view without format characters prevents basic zero-width evasion;
    # the original text and its SHA MUST remain available for human audit.
    normalized = "".join(ch for ch in normalized if ch not in _CONTROL)
    for code, pattern in _RULES:
        if pattern.search(normalized):
            reasons.add(code)
    return tuple(sorted(reasons))
