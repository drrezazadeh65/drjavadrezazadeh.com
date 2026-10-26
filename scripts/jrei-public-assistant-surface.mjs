/** Add existing JREI guide only to ordinary indexable public pages.
 * No changes to canonical URLs, identity routes, forms or server flags.
 * Never displays in password/account/payment/learner response flows.
 */
const PRIVATE=/(?:^|\/)(?:app|account|dashboard|assessments|student|observer|roles|login|register|recover|checkout|cart|payment|payment-start|payment-return|payment-result|payment-start|my|my-orders|student-records|upload|submission|manuscript)(?:\/|$)/i;
const RESTRICTED=/^(?:api|assets|private|admin|identity|foundation)\//;
export function isJreiPublicChatRoute(relative,html){
 if(typeof relative!=='string'||typeof html!=='string')return false;
 if(!/^(?:index\.html|(?:fa|en|journal)\/[a-zA-Z0-9/_-]*index\.html)$/.test(relative))return false;
 if(RESTRICTED.test(relative)||PRIVATE.test(relative))return false;
 if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)||
    /<meta\b[^>]*content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["']/i.test(html))return false;
 if(!html.includes('</head>')||!html.includes('</body>'))return false;
 return true;
}
export function includeJreiAssistant(relative,html){
 if(!isJreiPublicChatRoute(relative,html))return html;
 let out=html;
 if(!/\/assets\/css\/assistant\.css(?:\?|["'])/.test(out))
   out=out.replace('</head>','<link rel="stylesheet" href="/assets/css/assistant.css?v=jrei-welcome-20261025"></head>');
 if(!/\/assets\/js\/assistant\.js(?:\?|["'])/.test(out))
   out=out.replace('</body>','<script defer src="/assets/js/assistant.js?v=jrei-public-qwen-20261026"></script></body>');
 return out;
}
