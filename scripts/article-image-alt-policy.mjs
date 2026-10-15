// Accessibility/SEO contract for the 13 Persian article templates.
// Distinguishes an omitted alt attribute (error) from alt="" on a redundant
// decorative service icon next to an accessible text label (valid per WCAG).
// Pure functions, with negative fixtures in tests/article-image-alt-policy.test.mjs.
const attr=(tag,name)=>{
 const m=tag.match(new RegExp('\\b'+name+'\\s*=\\s*(["\'])(.*?)\\1','i'));
 return m?m[2]:null;
};
export function auditLaunchArticleImages(html){
 const issues=[];
 const tags=[...html.matchAll(/<img\b[^>]*>/gi)];
 let informative=0,decorative=0,missing=0;
 for(const match of tags){
  const tag=match[0],src=attr(tag,'src')||'(unknown)';
  const alt=attr(tag,'alt');
  if(alt===null){
   missing++;
   issues.push('missing alt attribute: '+src);
   continue;
  }
  if(alt.trim()){
   informative++;
   if(alt.trim().length<8)issues.push('meaningful image alt too short for review: '+src);
   continue;
  }
  decorative++;
  // Empty alt only makes sense here if the service pictogram is redundant with
  // readable strong-link text. Do not add keyword-stuffed alt text to icons.
  const before=html.slice(0,match.index);
  const anchorStart=before.lastIndexOf('<a ');
  const anchorClosed=before.lastIndexOf('</a>');
  const anchorEnd=html.indexOf('</a>',match.index+tag.length);
  if(anchorStart<0||anchorStart<=anchorClosed||anchorEnd<0){
   issues.push('unjustified empty alt outside labelled service link: '+src);
   continue;
  }
  const anchor=html.slice(anchorStart,anchorEnd+4);
  const open=anchor.match(/^<a\b[^>]*>/i)?.[0]||'';
  const className=attr(open,'class')||'';
  const label=anchor.match(/<strong\b[^>]*>([\s\S]*?)<\/strong>/i)?.[1]?.replace(/<[^>]*>/g,'').trim()||'';
  const appearsOnce=(anchor.match(/<img\b/gi)||[]).length===1;
  if(!className.split(/\s+/).includes('launch-offer')||label.length<4||!appearsOnce){
   issues.push('decorative service icon lacks independent readable link text: '+src);
  }
 }
 return {images:tags.length,informative,decorative,missing,issues};
}
