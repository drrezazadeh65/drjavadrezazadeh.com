/**
 * Feature-state registry: source presence MUST NOT be shown as live readiness.
 */
export const NEWS_FEATURES=Object.freeze({
  DISCOVERY:'SOURCE_ONLY',EVIDENCE:'SOURCE_ONLY',
  BILINGUAL_EDITORIAL:'SOURCE_ONLY',IMAGERY:'SOURCE_ONLY',
  OWNER_APPROVAL:'SOURCE_ONLY',PUBLIC_PUBLISHER:'NOT_CONNECTED',
  BREAKING_NEWS:'NOT_CONNECTED',EXAM_CALENDAR:'SOURCE_ONLY',
  REMINDERS:'SOURCE_ONLY',NEWSLETTER:'SOURCE_ONLY',
  SOCIAL_DISTRIBUTION:'NOT_CONNECTED',
  NEWS_SEARCH:'SOURCE_ONLY',SEMANTIC_LINKS:'SOURCE_ONLY',
  CONTEXTUAL_JREI:'NOT_CONNECTED',CMS:'NOT_CONNECTED',
  MOTHER_DB_MIGRATION:'NOT_APPLIED',VALIDATION:'NOT_RUN',
  PUBLIC_RELEASE:'NOT_DEPLOYED'
});
export function newsReleaseState(){
  return Object.freeze({schema:'jr.jrei.news-release-status.v1',
    features:NEWS_FEATURES,
    ownerRequestedNoInterimTests:true,
    interimTestsPerformedByThisModule:false,
    sourceCodeDoesNotProveOperationalReadiness:true,
    publicPublicationEnabled:false,
    finalIntegratedTestsRequiredBeforeRelease:true});
}
