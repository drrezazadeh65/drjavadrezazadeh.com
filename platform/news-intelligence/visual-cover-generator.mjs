/**
 * ORIGINAL, server-renderable JREI breaking-news vector cover generator.
 * Outputs self-contained SVG markup only; no image API, files, network calls,
 * embedded HTML, remote images or counterfeit event photographs.
 */
import {assert,safeText,sha256} from './contracts.mjs';
import {NEWS_IMAGE_TEMPLATES} from './media.mjs';
const xml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  .replace(/'/g,'&apos;');
function wrapWords(message,maxChar,maxLines){
  const words=message.trim().split(/\s+/u);
  const lines=[];let line='';
  for(const word of words){
    const next=line?line+' '+word:word;
    if(Array.from(next).length>maxChar&&line){
      lines.push(line);line=word;
      if(lines.length>=maxLines-1)break;
    }else line=next;
  }
  if(line&&lines.length<maxLines)lines.push(line);
  if(words.join(' ').length>lines.join(' ').length){
    const end=lines.length-1;
    lines[end]=Array.from(lines[end]).slice(0,maxChar-1).join('').trimEnd()+'…';
  }
  return lines;
}
export function generateOriginalNewsCover({
  language='fa',kind='BREAKING',headline,
  sourceLabel='JREI EDUCATION NEWS',edition='NEWS'
}={}){
  assert(['fa','en'].includes(language)&&
    Object.hasOwn(NEWS_IMAGE_TEMPLATES,kind)&&
    safeText(headline,8,240)&&safeText(sourceLabel,4,70)&&
    safeText(edition,3,30),'NEWS_COVER_INPUT_INVALID');
  const fa=language==='fa';
  const lines=wrapWords(headline,fa?30:43,4);
  const x=fa?1452:148,anchor=fa?'end':'start';
  const textLines=lines.map((line,index)=>'<text x="'+x+'" y="'+
    (370+index*104)+'" text-anchor="'+anchor+
    '" direction="'+(fa?'rtl':'ltr')+
    '" font-family="'+(fa?
      'Vazirmatn,IRANSans,Tahoma,sans-serif':
      'Georgia,Arial,sans-serif')+
    '" font-size="'+(fa?69:72)+
    '" font-weight="700" fill="#F7F3E9">'+xml(line)+'</text>').join('');
  const kicker=fa?'خبر و راهنمای اقدام':'NEWS · WHAT NEXT?';
  const label=fa?NEWS_IMAGE_TEMPLATES[kind].labelFa:
    NEWS_IMAGE_TEMPLATES[kind].labelEn;
  const graphic='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-label="'+xml(headline)+'">'+
    '<defs><linearGradient id="ni-bg" x1="0" y1="0" x2="1" y2="1">'+
    '<stop offset="0" stop-color="#101315"/>'+
    '<stop offset="1" stop-color="#262B2E"/></linearGradient>'+
    '<radialGradient id="ni-halo"><stop offset="0" stop-color="#C7A972" stop-opacity=".28"/>'+
    '<stop offset="1" stop-color="#C7A972" stop-opacity="0"/></radialGradient></defs>'+
    '<rect width="1600" height="900" fill="url(#ni-bg)"/>'+
    '<circle cx="1320" cy="190" r="540" fill="url(#ni-halo)"/>'+
    '<path d="M0 728 L1600 550 M0 770 L1600 592" stroke="#C9AA76" stroke-opacity=".18" stroke-width="2"/>'+
    '<rect x="84" y="84" width="1432" height="730" rx="24" fill="none" stroke="#BDA16E" stroke-opacity=".62" stroke-width="3"/>'+
    '<path d="M84 154h1432" stroke="#BDA16E" stroke-opacity=".35"/>'+
    '<rect x="120" y="98" width="92" height="36" rx="6" fill="#BDA16E"/>'+
    '<text x="166" y="123" text-anchor="middle" font-family="Arial,sans-serif" font-size="19" font-weight="800" fill="#101315">JREI</text>'+
    '<text x="238" y="123" font-family="Arial,sans-serif" font-size="23" letter-spacing="2" fill="#E6D1A7">'+xml(sourceLabel)+'</text>'+
    '<text x="'+x+'" y="250" text-anchor="'+anchor+
    '" font-family="Arial,Tahoma,sans-serif" font-size="34" fill="#CDB181">'+xml(label)+'</text>'+
    textLines+
    '<rect x="120" y="757" width="1360" height="2" fill="#A88F61" opacity=".7"/>'+
    '<text x="130" y="790" font-family="Arial,Tahoma,sans-serif" font-size="23" fill="#E2D5BB">'+xml(kicker)+'</text>'+
    '<text x="1458" y="790" text-anchor="end" font-family="Arial,sans-serif" font-size="20" fill="#A88F61">'+xml(edition)+'</text>'+
    '</svg>';
  return Object.freeze({schema:'jr.jrei.original-news-vector.v1',
    mime:'image/svg+xml',width:1600,height:900,language,kind,
    originalDesign:true,notDocumentaryPhotography:true,
    svg:graphic,sha256:sha256(graphic),
    requiresAssetApprovalAndSafeRasterDerivatives:true,
    generatedButNotSaved:true});
}
