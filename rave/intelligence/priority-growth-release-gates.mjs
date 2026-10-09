/** Offline release gates for the priority acquisition-to-revenue engines. */
import {auditBilingualPages} from './master-seo-audit.mjs';
import {validateCommerceCatalog} from './commerce-catalog-quality.mjs';
import {validateMagazineArticle} from './magazine-editorial-engine.mjs';
import {aiEngineStatus} from './ai-engine.mjs';
export function assessPriorityLaunch({pages=[],products=[],articles=[]}={}){
 const seo=auditBilingualPages(pages),commerce=validateCommerceCatalog(products);
 const magazine=articles.map(article=>{try{return {id:article?.id??null,...validateMagazineArticle(article),valid:true}}catch(error){return {id:article?.id??null,valid:false,reason:error.message}}});
 const ai=aiEngineStatus();
 const gates={
  seo:pages.length>0&&seo.passed,
  commerce:products.length>0&&commerce.valid,
  magazine:articles.length>0&&magazine.every(a=>a.valid),
  ai:ai.connected&&ai.providerConfigured
 };
 return {gates,readyForLiveRelease:false,requiresIntegrationTesting:true,missingEvidence:Object.entries(gates).filter(([,ok])=>!ok).map(([name])=>name),details:{seo,commerce,magazine,ai},networkCalled:false,productionTouched:false};
}
