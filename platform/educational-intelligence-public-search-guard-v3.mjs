/**
 * Conservative search hygiene for a PUBLIC catalogue URL, not a PII classifier.
 * The trusted backend must independently validate every request and source row.
 * This helper performs no I/O and never stores or transmits search text.
 */
export function isUnsafePublicCatalogueSearch(search) {
  if (typeof search !== 'string') return true;
  const normalized = search.normalize('NFKC').replace(/[۰-۹٠-٩]/gu, digit => {
    const code = digit.codePointAt(0);
    return String.fromCharCode(48 + (code >= 0x6f0 ? code - 0x6f0 : code - 0x660));
  });
  // Bidi controls can disguise text displayed in URLs or review consoles.
  if (/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(search)) return true;
  if (/(?:https?:\/\/|www\.|\S+@\S+)/iu.test(normalized)) return true;
  // Remove punctuation, spacing, ZWNJ, zero-width characters, and other
  // non-letter/non-number separators ONLY for numeric identifier detection.
  // Retain letters so unrelated numbers in descriptive text are not joined.
  const joined = normalized.replace(/[^\p{L}\p{N}]/gu, '');
  return /\d{9,}/u.test(joined);
}
