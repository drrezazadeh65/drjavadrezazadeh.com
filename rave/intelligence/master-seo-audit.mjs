/** Offline Master SEO audit. Accepts supplied page metadata only; never fetches or changes a live site. */
const LANGS=['fa','en'];
function safeUrl(path){return typeof path==='string'&&/^\/(fa|en)\/(?:[^?#]*)$/.test(path)&&!path.includes('..')&& !path.includes('//');}
export function auditBilingualPages(pages=[]){
 if(!Array.isArray(pages))throw new TypeError('Pages must be an array');
 const findings=[],paths=new Map();
 const add=(code,path,severity='error')=>findings.push({code,path,severity});
 for(const page of pages){
  if(!page||!safeUrl(page.path)){add('invalid_path',page?.path??'');continue}
  if(paths.has(page.path))add('duplicate_path',page.path);
  paths.set(page.path,page);
  const locale=page.path.split('/')[1];
  if(page.locale!==locale||!LANGS.includes(page.locale))add('locale_mismatch',page.path);
  if(typeof page.title!=='string'||!page.title.trim())add('missing_title',page.path);
  if(typeof page.description!=='string'||!page.description.trim())add('missing_description',page.path,'warning');
  if(page.indexable===true){
   if(page.canonical!==page.path)add('canonical_mismatch',page.path);
   if(!page.hreflang||page.hreflang[locale]!==page.path)add('self_hreflang_missing',page.path);
  }
  if(page.indexable===false&&page.inSitemap===true)add('noindex_in_sitemap',page.path);
 }
 for(const page of pages){
  if(!page||!safeUrl(page.path)||page.indexable!==true||!page.hreflang)continue;
  for(const lang of LANGS){
   const target=page.hreflang[lang];
   if(target==null)continue;
   if(!safeUrl(target)||target.split('/')[1]!==lang){add('invalid_hreflang_target',page.path);continue}
   const other=paths.get(target);
   if(!other||other.indexable!==true){add('missing_hreflang_target',page.path);continue}
   if(other.hreflang?.[page.locale]!==page.path)add('hreflang_not_reciprocal',page.path);
  }
 }
 return Object.freeze({pages:pages.length,findings,passed:findings.filter(f=>f.severity==='error').length===0,offline:true});
}
