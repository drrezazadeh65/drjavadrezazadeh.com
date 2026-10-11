/**
 * Account connectivity catalogue for the ADMIN configuration screen.
 * Guides are not credential forms. All OAuth exchanges are SERVER-SIDE.
 * Limits below are CONSERVATIVE EDITORIAL TARGETS, not verified platform maxima.
 */
export const CONNECTORS=Object.freeze({
 instagram:{name:'اینستاگرام',kind:'oauth_meta',official:'https://developers.facebook.com/apps/',
   how:'حساب حرفه‌ای Business یا Creator را به صفحه فیس‌بوک مرتبط کنید و از داخل مجوزدهی رسمی Meta اتصال بدهید.',
   account:'professional',formats:['photo','carousel','reel','eligible_story'],editorialTarget:1500,tags:5,linkedCaption:false,status:'app_approval_required'},
 facebook:{name:'فیس‌بوک',kind:'oauth_meta',official:'https://developers.facebook.com/apps/',
   how:'با حساب خود در Meta وارد شوید و صفحه‌ای را که اختیار مدیریتش دارید انتخاب کنید.',
   account:'managed_page',formats:['link','photo','video','eligible_story'],editorialTarget:900,tags:3,linkedCaption:true,status:'app_approval_required'},
 x:{name:'ایکس / توییتر',kind:'oauth_pkce',official:'https://developer.x.com/',
   how:'در X Developer برنامه بسازید، سطح دسترسی نوشتن را فعال کنید و از صفحه رسمی X مجوز بدهید؛ هزینه API را بررسی کنید.',
   account:'user',formats:['text','image','video'],editorialTarget:240,tags:2,linkedCaption:true,status:'paid_api_and_oauth_required'},
 telegram:{name:'تلگرام',kind:'bot_token',official:'https://core.telegram.org/bots/tutorial',
   how:'با BotFather ربات بسازید، آن را مدیر کانال کنید و شناسه کانال را در پنل خصوصی ثبت کنید.',
   account:'channel_bot',formats:['text','image','album','video'],editorialTarget:1800,tags:3,linkedCaption:true,status:'server_private_token_required'},
 eitaa:{name:'ایتا',kind:'app_token',official:'https://eitaayar.ir/',
   how:'در ایتایار برنامه یا اتصال ارسال ایجاد کنید و دسترسی ارسال به مقصد را بدهید؛ جزئیات کانال باید جداگانه آزموده شود.',
   account:'authorized_channel',formats:['text','verified_media'],editorialTarget:1700,tags:3,linkedCaption:true,status:'server_private_token_required'},
 aparat:{name:'آپارات',kind:'provider_review',official:'https://www.aparat.com/',
   how:'در آپارات به حساب خود وارد شوید. برای اتصال مستقیم انتشار ویدئو ابتدا روش رسمی و مجوز بارگذاری را تأیید می‌کنیم.',
   account:'video_channel',formats:['video'],editorialTarget:1200,tags:5,linkedCaption:true,status:'upload_api_unverified'},
 whatsapp:{name:'واتس‌اپ بیزینس',kind:'meta_business',official:'https://business.facebook.com/',
   how:'شماره کسب‌وکار را در Meta Business ثبت و تأیید کنید؛ ارسال فقط به مخاطب دارای رضایت و با الگوی تأییدشده مجاز است.',
   account:'business_api',formats:['opt_in_approved_template'],editorialTarget:null,tags:0,linkedCaption:true,status:'consent_and_template_required'},
 youtube:{name:'یوتیوب',kind:'oauth_google',official:'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
   how:'در Google Cloud پروژه بسازید و دسترسی youtube.upload به کانال موردنظر را تأیید کنید.',
   account:'video_channel',formats:['video','short'],editorialTarget:2500,tags:3,linkedCaption:true,status:'oauth_app_required'},
 linkedin:{name:'لینکدین',kind:'oauth_linkedin',official:'https://www.linkedin.com/developers/',
   how:'در LinkedIn Developer برنامه ایجاد کنید؛ با مجوز نوشتنِ عضو یا صفحه واجد شرایط اتصال بدهید.',
   account:'profile_or_org',formats:['text','article','image','video'],editorialTarget:1600,tags:3,linkedCaption:true,status:'app_permission_required'},
 threads:{name:'تردز',kind:'oauth_meta_threads',official:'https://developers.facebook.com/',
   how:'اپلیکیشن و دسترسی انتشار Threads را ثبت و از طریق صفحه رسمی متا مجوز بدهید.',
   account:'profile',formats:['text','image','video'],editorialTarget:450,tags:2,linkedCaption:true,status:'adapter_pending'},
 bluesky:{name:'بلواسکای',kind:'oauth_or_app_password',official:'https://docs.bsky.app/',
   how:'ترجیحاً OAuth رسمی؛ در صورت پشتیبانی فقط رمز مخصوص برنامه را در خزانه خصوصی ذخیره کنید، نه رمز اصلی حساب.',
   account:'profile',formats:['text','image'],editorialTarget:280,tags:2,linkedCaption:true,status:'adapter_pending'},
 pinterest:{name:'پینترست',kind:'oauth',official:'https://developers.pinterest.com/',
   how:'اپلیکیشن توسعه‌دهنده، مجوز ایجاد Pin و بورد مرتبط با تصویر را تنظیم کنید.',
   account:'business',formats:['pin'],editorialTarget:400,tags:3,linkedCaption:true,status:'adapter_pending'},
 tiktok:{name:'تیک‌تاک',kind:'oauth',official:'https://developers.tiktok.com/',
   how:'برای Video Posting مجوز برنامه و حساب واجد شرایط دریافت کنید.',
   account:'profile',formats:['video'],editorialTarget:150,tags:4,linkedCaption:false,status:'adapter_pending'},
 mastodon:{name:'ماستودون',kind:'instance_oauth',official:'https://docs.joinmastodon.org/client/intro/',
   how:'نمونه Mastodon را مشخص کرده و از صفحه رسمی همان سرور OAuth را تأیید کنید.',
   account:'instance_profile',formats:['text','image'],editorialTarget:450,tags:3,linkedCaption:true,status:'adapter_pending'},
 discord:{name:'دیسکورد',kind:'webhook',official:'https://discord.com/developers/docs/resources/webhook',
   how:'در کانال متعلق به خودتان یک Webhook مجاز بسازید؛ آدرس محرمانه فقط روی سرور ذخیره شود.',
   account:'server_channel',formats:['text','image'],editorialTarget:1700,tags:2,linkedCaption:true,status:'adapter_pending'},
 googlebusiness:{name:'پروفایل کسب‌وکار گوگل',kind:'review',official:'https://business.google.com/',
   how:'امکان انتشار عمومی پست جدید و وضعیت API فعلی باید پیش از فعال‌سازی بررسی شود.',
   account:'verified_business',formats:['verified_only'],editorialTarget:800,tags:0,linkedCaption:true,status:'capability_review_required'}
});
export const connectorPublicView=(id)=>{
 const c=CONNECTORS[id];
 if(!c)return null;
 const {name,kind,official,how,account,formats,editorialTarget,tags,linkedCaption,status}=c;
 return {id,name,kind,official,how,account,formats,editorialTarget,tags,linkedCaption,status,
   configured:false,connected:false,canPublish:false};
};
export function validateHandle(id,handle){
 if(!CONNECTORS[id])throw Error('Unsupported network');
 const value=String(handle??'').trim().replace(/^@/,'');
 if(value.length<2||value.length>100||/[\s<>"'\u0000-\u001f]/u.test(value))
  throw Error('Invalid public account/channel identifier');
 return value;
}
