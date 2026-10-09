/** Deterministic, review-gated matching of user needs to approved services.
 * No generative claims, inferred diagnoses, or invented prices.
 */
const normalize=s=>typeof s==='string'?s.normalize('NFKC').toLocaleLowerCase().trim():'';
const unique=a=>[...new Set(a)];
export function recommendApprovedServices({query='',locale='fa',services=[],limit=5}={}){
 if(!['fa','en'].includes(locale))throw new TypeError('Unsupported locale');
 if(!Array.isArray(services)||!Number.isSafeInteger(limit)||limit<1||limit>27)throw new TypeError('Invalid catalog or limit');
 const words=unique(normalize(query).split(/[\s،,؛;.!?؟]+/u).filter(w=>w.length>=3)).slice(0,24);
 if(words.length===0)return {recommendations:[],reason:'insufficient-need-description',humanReviewSuggested:true,productionTouched:false};
 const candidates=[];
 for(const s of services){
  if(s?.editorialApproved!==true||s?.active!==true||typeof s.id!=='string')continue;
  const url=s?.paths?.[locale];
  if(typeof url!=='string'||!url.startsWith('/'+locale+'/')||url.includes('//'))continue;
  const title=s?.[locale==='fa'?'titleFa':'titleEn'];
  const description=s?.[locale==='fa'?'descriptionFa':'descriptionEn'];
  if(!title||!description)continue;
  const tags=Array.isArray(s?.keywords?.[locale])?s.keywords[locale].map(normalize):[];
  const text=normalize(title+' '+description);
  const matched=words.filter(w=>tags.some(t=>t===w)||text.split(/[\s،,؛;.!?؟]+/u).includes(w));
  if(matched.length===0)continue;
  const priceKnown=Number.isSafeInteger(s.priceMinor)&&s.priceMinor>=0&&['IRR','USD'].includes(s.currency)&&s.priceApproved===true;
  candidates.push({serviceId:s.id,title,url,matchedTerms:matched,score:matched.length,price:priceKnown?{amountMinor:s.priceMinor,currency:s.currency}:null,checkoutAvailable:s.checkoutEnabled===true&&priceKnown,reason:'keyword-match-with-approved-catalog'});
 }
 candidates.sort((a,b)=>b.score-a.score||a.serviceId.localeCompare(b.serviceId));
 return {recommendations:candidates.slice(0,limit),reason:candidates.length?'approved-catalog-matches':'no-verified-match',humanReviewSuggested:candidates.length===0,claimsGenerated:false,productionTouched:false};
}
