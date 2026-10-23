/**
 * Conservative public-educational text identifier screen (source only).
 * Screens common directly identifying contact/payment patterns, including
 * Persian/Arabic numerals and spaced or dashed representations.
 *
 * This is a defence-in-depth heuristic, NOT de-identification, GDPR compliance
 * certification, or permission to process private learner records. Upstream
 * authentication, data minimisation, consent and provenance remain mandatory.
 */
const EMAIL=/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
const PHONE=/(?<!\d)(?:\+98|0098|0)9\d{9}(?!\d)/;
const CARD=/(?<!\d)\d{16}(?!\d)/;
function asciiDigits(s){
  return s.normalize('NFKC')
    .replace(/[۰-۹]/g,ch=>String(ch.charCodeAt(0)-0x06f0))
    .replace(/[٠-٩]/g,ch=>String(ch.charCodeAt(0)-0x0660));
}
export function hasDirectIdentifier(text){
  if(typeof text!=='string')return true;
  const readable=asciiDigits(text);
  if(EMAIL.test(readable))return true;
  // Merge separators ONLY between digits to detect formatted Iranian mobile
  // numbers and 4x4 payment-card layouts. Do not modify submitted source text.
  const joined=readable.replace(/(?<=\d)[\s\u00a0\u200c().-]+(?=\d)/g,'');
  return PHONE.test(joined)||CARD.test(joined);
}
