/**
 * JR EI V3: deterministic, non-executing request/response boundary for the
 * existing PUBLIC /api/konkur/programmes catalogue. No fetch, storage or LLM.
 * Call ONLY after receiving a trusted same-origin PHP response. This module
 * cannot authenticate the endpoint or independently verify a source document.
 */
import {compilePublicCatalogueToolCall} from './educational-intelligence-public-tool-v3.mjs';
import {adaptOfficialCatalogueResponse} from './educational-intelligence-catalogue-adapter-v3.mjs';

export const PUBLIC_EXCHANGE_VERSION = '3.0.4-bound-catalogue';
const denied = reason => Object.freeze({
  version: PUBLIC_EXCHANGE_VERSION, status: 'UNAVAILABLE', reason,
  items: Object.freeze([]), eligibilityEvaluated: false,
  probabilityAvailable: false, officialApplication: false,
  modelMayOverride: false,
});

/**
 * Bind one proposed public query to one trusted backend response.
 * Response year, pagination, size and requested examination group must agree.
 * This is a structural gate, NOT a server authentication or admission verdict.
 */
export function reviewPublicCatalogueExchange(proposedCall, response) {
  const compiled = compilePublicCatalogueToolCall(proposedCall);
  if (compiled.status !== 'READY_FOR_PUBLIC_READ')
    return denied('PUBLIC_TOOL_CALL_REJECTED');
  if (!response || typeof response !== 'object' || Array.isArray(response))
    return denied('INVALID_CATALOGUE_RESPONSE');

  const query = new URLSearchParams(compiled.relativeUrl.split('?')[1]);
  const year = Number(query.get('year'));
  const limit = Number(query.get('limit'));
  const page = Number(query.get('page'));
  const group = query.get('group');

  if (response.status === 'SOURCE_REVIEWED_CATALOGUE') {
    // PHP echoes these fields only when a query was executed. An empty or
    // unavailable catalogue is handled separately by the existing adapter.
    if (response.limit !== limit || response.page !== page)
      return denied('RESPONSE_PAGINATION_MISMATCH');
    if (!Array.isArray(response.records) || response.records.length > limit)
      return denied('RESPONSE_EXCEEDS_REQUESTED_LIMIT');
    if (group && response.records.some(row => !row || row.examinationGroup !== group))
      return denied('RESPONSE_EXAMINATION_GROUP_MISMATCH');
  } else if (Array.isArray(response.records) && response.records.length > 0) {
    return denied('NON_REVIEWED_RECORDS_PRESENT');
  }

  const adapted = adaptOfficialCatalogueResponse(response, {year});
  if (adapted.status !== 'SOURCE_REVIEWED_CATALOGUE')
    return denied(adapted.reason || 'SOURCE_REVIEWED_CATALOGUE_UNAVAILABLE');

  return Object.freeze({
    version: PUBLIC_EXCHANGE_VERSION, status: 'SOURCE_REVIEWED_CATALOGUE',
    items: adapted.items, eligibilityEvaluated: false,
    probabilityAvailable: false, officialApplication: false,
    modelMayOverride: false, sourceVerification: 'API_REPORTED_HUMAN_REVIEW',
    caveat: 'Catalogue facts only. Source and amendment approval must be independently enforced by the trusted PHP backend.',
  });
}
