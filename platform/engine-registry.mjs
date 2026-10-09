// Canonical inventory of existing domain engines. Metadata only: no engine is activated by this file.
// Keep the registry private; never infer production readiness from a source path.
export const ENGINE_REGISTRY_VERSION = '2026-10-09.1';
export const ENGINE_REGISTRY = Object.freeze([
  {id:'crm',module:'./crm-engine.mjs',domain:'relationships',capabilities:['lead-intake','qualification']},
  {id:'consultation',module:'./consultation-engine.mjs',domain:'consultations',capabilities:['triage','booking-workflow']},
  {id:'consultation-record',module:'./consultation-record-engine.mjs',domain:'consultations',capabilities:['case-records','follow-up']},
  {id:'commerce',module:'./commerce-engine.mjs',domain:'commerce',capabilities:['pricing','orders','entitlements']},
  {id:'communication',module:'./communication-engine.mjs',domain:'communications',capabilities:['consent-aware-message-planning']},
  {id:'assessment',module:'./assessment-engine.mjs',domain:'assessment',capabilities:['submissions','declared-scoring']},
  {id:'assessment-authoring',module:'./assessment-authoring-engine.mjs',domain:'assessment',capabilities:['instrument-versioning']},
  {id:'report',module:'./report-engine.mjs',domain:'reports',capabilities:['versioned-report-approval']},
  {id:'research-export',module:'./research-export-engine.mjs',domain:'research',capabilities:['governed-research-export']},
  {id:'golden-talent',module:'./golden-talent-engine.mjs',domain:'talent',capabilities:['evidence-routing']},
  {id:'golden-talent-deep',module:'./golden-talent-deep-module-engine.mjs',domain:'talent',capabilities:['deep-modules']},
  {id:'golden-talent-analytics',module:'./golden-talent-evidence-analytics.mjs',domain:'talent',capabilities:['evidence-analytics']},
  {id:'bahar',module:'./bahar-engine.mjs',domain:'talent',capabilities:['longitudinal-development']}
].map(entry=>Object.freeze({...entry,capabilities:Object.freeze(entry.capabilities)})));
export function getEngine(id) { return ENGINE_REGISTRY.find(engine=>engine.id===id) ?? null; }
export function listEngineDomains() { return [...new Set(ENGINE_REGISTRY.map(engine=>engine.domain))]; }
export function validateEngineRegistry(registry=ENGINE_REGISTRY) {
  const ids=new Set(), paths=new Set();
  for (const engine of registry) {
    if(!engine.id||!engine.module||!engine.domain||!Array.isArray(engine.capabilities)||!engine.capabilities.length) throw new Error('Incomplete engine metadata');
    if(ids.has(engine.id)||paths.has(engine.module)) throw new Error('Duplicate engine identity or module');
    ids.add(engine.id);paths.add(engine.module);
  }
  return true;
}
