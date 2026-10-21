/**
 * JR EI V3.0.5 — source-anchored catalogue facts for a future educational assistant.
 * Pure formatter: no model calls, network, persistence, candidate data or selection ranking.
 * The trusted PHP API must first establish source approvals and amendment precedence.
 * Server/transport authenticity is NOT established by this module.
 */
import {reviewPublicCatalogueExchange} from './educational-intelligence-public-exchange-v3.mjs';

export const EVIDENCE_ANSWER_VERSION = '3.0.5-source-anchored-facts';
const languages = Object.freeze(['fa', 'en']);
const notices = Object.freeze({
  fa: Object.freeze({
    label: 'رشته‌محل‌های دارای ارجاع به منبع',
    limitation: 'این فهرست فقط داده‌های رشته‌محل را نشان می‌دهد؛ شرایط فردی، احتمال قبولی و ثبت‌نام رسمی بررسی نشده‌اند.',
    sourcePrefix: 'منبع', revision: 'ویرایش', page: 'صفحه PDF',
  }),
  en: Object.freeze({
    label: 'Source-cited programme locations',
    limitation: 'These are programme facts only; individual eligibility, admission probability and official submission have not been assessed.',
    sourcePrefix: 'Source', revision: 'revision', page: 'PDF page',
  }),
});
const safeText = (value, max) => typeof value === 'string' && value.trim().length > 0 &&
  value.length <= max && !/[<>\u0000-\u001f\u007f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(value);
const collapse = text => text.replace(/\s+/gu, ' ').trim();
const freezeFacts = facts => Object.freeze(facts.map(fact => Object.freeze(fact)));
const unavailable = reason => Object.freeze({
  version: EVIDENCE_ANSWER_VERSION, status: 'UNAVAILABLE', reason,
  label: null, notice: null, facts: Object.freeze([]),
  recommendationsGenerated: false, individualEligibilityAssessed: false,
  admissionProbabilityAvailable: false, officialSubmission: false,
  sourceAuthenticityIndependentlyVerified: false, modelMayOverride: false,
});

/**
 * Accept only one model-proposed PUBLIC tool call and its matching trusted
 * server response. Never accept model-generated citations as evidence.
 * String fields remain untrusted *data*: consumers must render with textContent,
 * not innerHTML, and must not convert them into model instructions.
 */
export function composeSourceCitedCatalogueFacts(proposedCall, trustedBackendResponse, {locale='fa'}={}) {
  if (!languages.includes(locale)) return unavailable('UNSUPPORTED_LOCALE');
  const reviewed = reviewPublicCatalogueExchange(proposedCall, trustedBackendResponse);
  if (reviewed.status !== 'SOURCE_REVIEWED_CATALOGUE')
    return unavailable(reviewed.reason || 'SOURCE_CATALOGUE_UNAVAILABLE');
  if (!Array.isArray(reviewed.items) || reviewed.items.length === 0 || reviewed.items.length > 50)
    return unavailable('INVALID_REVIEWED_ITEM_COUNT');
  const t = notices[locale];
  const facts=[];
  for (const item of reviewed.items) {
    if (!item || !safeText(item.programmeCode,5) || !/^\d{5}$/.test(item.programmeCode) ||
        !safeText(item.programme,220) || !safeText(item.university,220) ||
        (item.city !== null && item.city !== undefined && !safeText(item.city,140)) ||
        !item.evidence || !safeText(item.evidence.document,160) ||
        !Number.isSafeInteger(item.evidence.revision) || item.evidence.revision < 1 ||
        !Number.isSafeInteger(item.evidence.pdfPage) || item.evidence.pdfPage < 1 ||
        item.probability !== null || item.eligibility !== 'NOT_ASSESSED')
      return unavailable('UNSAFE_OR_UNCITED_CATALOGUE_ITEM');
    const source = Object.freeze({
      kind: 'API_REPORTED_HUMAN_REVIEW',
      document: collapse(item.evidence.document),
      revision: item.evidence.revision,
      pdfPage: item.evidence.pdfPage,
      // Page reference is *reported by API*; authenticity requires server-side verification.
      independentlyVerified: false,
    });
    facts.push(Object.freeze({
      kind: 'PROGRAMME_FACT_NOT_RECOMMENDATION',
      programmeCode: item.programmeCode,
      programme: collapse(item.programme), university: collapse(item.university),
      city: typeof item.city === 'string' ? collapse(item.city) : null,
      statedCapacity: item.capacity,
      admissionYear: item.admissionYear,
      source,
      citationText: t.sourcePrefix + ': ' + source.document + ' · ' + t.revision + ' ' + source.revision + ' · ' + t.page + ' ' + source.pdfPage,
      // All downstream recommendation/eligibility/prediction claims are forbidden.
      eligibility: 'NOT_ASSESSED', admissionProbability: null,
      isRankedRecommendation: false,
    }));
  }
  return Object.freeze({
    version: EVIDENCE_ANSWER_VERSION, status: 'SOURCE_CITED_FACTS_ONLY',
    locale, label: t.label, notice: t.limitation,
    facts: freezeFacts(facts),
    recommendationsGenerated: false, individualEligibilityAssessed: false,
    admissionProbabilityAvailable: false, officialSubmission: false,
    sourceAuthenticityIndependentlyVerified: false, modelMayOverride: false,
    caveat: 'Each citation reflects PHP-reported source review, not independent authentication by this formatter.',
  });
}
