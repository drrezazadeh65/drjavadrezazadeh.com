/**
 * Preproduction RCAS browser-preview provenance gate.
 * No student answers, norms, trait scores or cross-language equivalence.
 * The registry is supplied as an input to keep this policy pure and testable.
 */
export function classifyRcasBrowserPreview(snapshot, locale, registry) {
  const deny = reason => Object.freeze({accepted:false,reason,
    scientificStatus:'PREVALIDATION',canAggregateWithOtherEdition:false,
    canPublishProfessionalReport:false});
  if(!['fa','en'].includes(locale))return deny('UNSUPPORTED_LOCALE');
  if(!snapshot || typeof snapshot!=='object' ||
     typeof snapshot.rcasRevision!=='string' ||
     snapshot.completed!==true || snapshot.completedItemCount!==28)
    return deny('INCOMPLETE_OR_UNVERSIONED_PREVIEW');
  const entry=registry?.instruments?.find(x=>x?.id==='RCAS-CORE');
  if(!entry || entry.release_state!=='PREVIEW_ONLY' ||
     entry.scientific_status!=='PREVALIDATION' ||
     entry.scoring_enabled!==false ||
     entry.expected_item_count!==28 ||
     entry.allowed_storage!=='BROWSER_FORM_ONLY_NO_RAW_RESPONSE_UPLOAD')
    return deny('UNTRUSTED_REGISTRY');
  const edition=entry.browser_preview_editions?.find(x=>x?.locale===locale);
  if(!edition || edition.revision!==snapshot.rcasRevision ||
     edition.expected_item_count!==28 ||
     edition.scoring_enabled!==false ||
     edition.cross_locale_equivalence_established!==false ||
     edition.human_approval!==false ||
     edition.content_sha256!==null ||
     !['BROWSER_PREVIEW_ONLY','TRANSLATION_PILOT_BROWSER_ONLY'].includes(edition.mode))
    return deny('UNREGISTERED_OR_INCOMPATIBLE_EDITION');
  if((locale==='fa'&&edition.source!=='assets/js/rcas-start.js') ||
     (locale==='en'&&edition.source!=='assets/js/rcas-start-en.js'))
    return deny('INSTRUMENT_SOURCE_MISMATCH');
  if(snapshot.routeBasis!=='SELF_SELECTED_UNVALIDATED' ||
     snapshot.p0Validated!==true ||
     snapshot.routingEvidenceCompleted!==true ||
     snapshot.meaningfulCoreEvidence!==true)
    return deny('INSUFFICIENT_OR_INVALID_CONTEXT');
  if(!['D1','D2','D3','D4','D5','D6'].includes(snapshot.route))
    return deny('INVALID_SELF_SELECTED_DOMAIN');
  return Object.freeze({
    accepted:true, reason:'EXACT_EDITION_BROWSER_REFLECTION',
    locale,revision:edition.revision,scientificStatus:'PREVALIDATION',
    deliveryMode:edition.mode,canAggregateWithOtherEdition:false,
    canPublishProfessionalReport:false,canProduceNormativeScores:false
  });
}
