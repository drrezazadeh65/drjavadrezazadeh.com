/** Production readiness must be demonstrated, never inferred from preview code. */
export const REQUIRED_GATES=Object.freeze(['authenticatedAdmin','roleAuthorization','persistentContentStore','publicationPipeline','mediaUploadAndConversion','cacheInvalidation','seoRegression','commerceVerified','crmPrivacy','goldenTalentIntegration','raveLiveSources','backupRestore','securityReview','endToEndTests']);
export function evaluateAdminReadiness(evidence={}){
 const gates=REQUIRED_GATES.map(name=>({name,passed:evidence[name]===true}));
 return Object.freeze({ready:gates.every(g=>g.passed),passed:gates.filter(g=>g.passed).length,total:gates.length,blocked:gates.filter(g=>!g.passed).map(g=>g.name)});
}
