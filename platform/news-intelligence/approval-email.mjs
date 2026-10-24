/** Escape-safe owner preview email; links ONLY to existing protected admin. */
import {assert,plain,safeText} from './contracts.mjs';
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function renderOwnerEmail({preview,emailDescriptor}={}){
  assert(plain(preview)&&preview.schema==='jr.jrei.news-editorial-preview.v1'&&
    plain(emailDescriptor)&&emailDescriptor.schema==='jr.jrei.news-approval-email.v1'&&
    emailDescriptor.previewReference===preview.approvalDigest&&
    safeText(emailDescriptor.recipient,6,300),
    'NEWS_OWNER_EMAIL_PREVIEW_INVALID');
  const rows=[
    ['Urgency / فوریت',preview.priority],
    ['Official source / منبع رسمی',preview.sourceUrl],
    ['Verification / تأیید شواهد',preview.verification.reviewedAt],
    ['Approval / تأیید','Required — not yet authorized']
  ];
  const html='<!doctype html><html lang="fa" dir="rtl"><head>'+
    '<meta charset="utf-8"></head><body style="font-family:Tahoma,Arial,sans-serif;'+
    'color:#202020;line-height:1.8;padding:20px">'+
    '<h1 style="font-size:22px">JREI | پیش‌نمایش تحریریه</h1>'+
    '<h2>'+escape(preview.fa.headline)+'</h2><p>'+escape(preview.fa.summary)+'</p>'+
    '<section lang="en" dir="ltr"><h2>'+escape(preview.en.headline)+
    '</h2><p>'+escape(preview.en.summary)+'</p></section>'+
    '<table role="presentation">'+rows.map(([k,v])=>'<tr><th>'+escape(k)+
      '</th><td>'+escape(v)+'</td></tr>').join('')+'</table>'+
    '<p>هیچ خبری تا تأیید شما منتشر نمی‌شود.</p>'+
    '<p><a href="'+escape(emailDescriptor.previewUrl)+'">'+
    'ورود امن به داشبورد و بررسی نسخه کامل</a></p>'+
    '<p>این پیام مجوز انتشار یا لینک تأیید یک‌کلیکی نیست.</p>'+
    '</body></html>';
  const plainText=['JREI | Editorial Review',preview.fa.headline,
    preview.fa.summary,preview.en.headline,preview.en.summary,
    'Source: '+preview.sourceUrl,
    'Review securely: '+emailDescriptor.previewUrl].join('\n\n');
  return Object.freeze({recipient:emailDescriptor.recipient,
    subject:emailDescriptor.subject,html,plainText,
    requiresExistingSmtpOutbox:true,queuedOnly:true,actuallySent:false});
}
