// Canonical inventory of existing domain engines. Metadata only: no engine is activated by this file.
// Keep the registry private; never infer production readiness from a source path.
export const ENGINE_REGISTRY_VERSION = '2026-10-09.2';
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

// Bridge to the pre-existing governed module registry. A source engine is not a new
// independent service: its owner is one of the established domain modules.
export const ENGINE_MODULE_OWNERS = Object.freeze({
  crm:'relationships',consultation:'consultation','consultation-record':'consultation',
  commerce:'commerce',communication:'communications',assessment:'golden-talent-evidence',
  'assessment-authoring':'golden-talent-evidence',report:'golden-talent-evidence',
  'research-export':'research-export','golden-talent':'golden-talent-evidence',
  'golden-talent-deep':'golden-talent-evidence','golden-talent-analytics':'golden-talent-evidence',
  bahar:'bahar'
});
export function validateEngineOwnership(moduleRegistry) {
  const known=new Set((moduleRegistry?.modules||[]).map(m=>m.id));
  const failures=[];
  for(const engine of ENGINE_REGISTRY){
    const owner=ENGINE_MODULE_OWNERS[engine.id];
    if(!owner||!known.has(owner)) failures.push(engine.id+': missing module owner '+owner);
  }
  for(const id of Object.keys(ENGINE_MODULE_OWNERS)) if(!getEngine(id)) failures.push(id+': orphan owner mapping');
  return {valid:failures.length===0,failures,engine_count:ENGINE_REGISTRY.length};
}
