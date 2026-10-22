/**
 * Existing but historically dispersed site capabilities, projected into the
 * SAME ENG-13 administrative controller. No second dashboard/engine/database.
 * A file existing in Git is not live activation or a verified paid service.
 */
import fs from 'node:fs';
import path from 'node:path';

const definitions=[
 ['redirect-301-410','ENG-01','Redirect and historical authority','ریدایرکت و اعتبار تاریخی دامنه',
  ['.htaccess','platform/historical-authority-registry.json','scripts/historical-authority-audit.mjs'],
  'protected_seo_rule','ops-http-health'],
 ['incoming-404','ENG-01','Incoming 404 recovery','ورودی‌های ۴۰۴ و بازیابی بک‌لینک',
  ['scripts/historical-404-log-analyzer.mjs','api/operations-http-log.php'],
  'private_log_collector_opt_in','ops-http-health'],
 ['robots-sitemaps','ENG-01','Robots and bilingual sitemaps','ربات‌ها و سایت‌مپ‌های دوزبانه',
  ['robots.txt','sitemap.xml','sitemap-fa.xml','sitemap-en.xml'],
  'protected_indexing_baseline','ops-page-quality'],
 ['schema-entities','ENG-01','Structured data and entity graphs','اسکیما و موجودیت‌های علمی',
  ['scripts/schema-entity-inventory.mjs','scripts/seo-regression.mjs'],
  'approved_source_review','ops-page-quality'],
 ['page-quality-scores','ENG-01','Per-page multidimensional scoring','امتیازهای مستقل تمام صفحات',
  ['scripts/operations-page-quality.mjs','api/operations-page-quality.php'],
  'read_only_manual_inspection','ops-page-quality'],
 ['geo-ai-discovery','ENG-02','GEO and machine-readable discovery','کشف محتوا و GEO',
  ['llms.txt','robots.txt','api/operations-ai-visibility.php'],
  'source_and_provider_evidence_separate','ops-page-quality'],
 ['social-network-integrations','ENG-03','Social publication and provider stats','انتشار و آمار شبکه‌های اجتماعی',
  ['platform/social-distribution/connections.mjs','api/operations-social.php'],
  'provider_approval_required','ops-source-directory'],
 ['talent-assessment','ENG-04','Golden Talent scientific assessment','ارزیابی علمی استعداد',
  ['api/golden-talent.php'],
  'protected_scientific_workflow','ops-master-engine-control'],
 ['commerce-settlement','ENG-05','Commerce and payment reconciliation','تجارت و تطبیق پرداخت',
  ['api/operations-commerce.php','api/index.php'],
  'protected_commercial_workflow','ops-master-engine-control'],
 ['journal-native-editorial','ENG-06','JHELA editorial workflow','فرایند سردبیری نشریه',
  ['api/jhela-native-editorial.php'],
  'protected_scholarly_workflow','ops-master-engine-control'],
 ['newsletter-consent','ENG-07','Newsletter and consent delivery','خبرنامه و رضایت کاربران',
  ['api/newsletter-worker.php','api/newsletter-delivery.php'],
  'private_consent_critical','ops-master-engine-control'],
 ['pwa-update-engine','ENG-10','PWA and service worker updates','اپلیکیشن و سرویس‌ورکر',
  ['site.webmanifest','sw.js'],
  'protected_pwa_baseline','ops-master-engine-control'],
 ['response-security-headers','ENG-11','Response security headers','هدرهای امنیتی و حریم خصوصی',
  ['.htaccess','api/index.php'],
  'protected_security_baseline','ops-alert-center'],
 ['caching-and-compression','ENG-11','LiteSpeed cache and HTTP compression','کش و فشرده‌سازی HTTP',
  ['.htaccess','scripts/bertina-postrelease-check.mjs'],
  'protected_performance_baseline','ops-alert-center'],
 ['site-runtime-health','ENG-11','Server responses and runtime error health','سلامت پاسخ سرور و خطاهای HTTP',
  ['api/operations-http-log.php','api/operations-response-monitor.php'],
  'read_only_opt_in_cli_sensor','ops-alert-center'],
 ['admin-audit-and-2fa','ENG-12','MFA, access control and audit log','احراز هویت دومرحله‌ای و لاگ مدیر',
  ['api/operations.php','api/operations-schema.php'],
  'protected_authentication','ops-alert-center'],
 ['source-scheduler-and-retention','ENG-13','Collection schedule and retention','زمان‌بندی گردآوری و نگهداری اطلاعات',
  ['api/operations-collection.php','api/operations-source-controls.php'],
  'manual_daily_weekly_controls','ops-source-directory'],
 ['incident-mail-alerts','ENG-13','Critical incident email outbox','هشدار فوری ایمیلی رخدادها',
  ['api/operations-alerts.php','api/internal/operations-alert-mail-worker.php'],
  'smtp_cron_configuration_required','ops-alert-center']
];
export function hiddenFeatureSourceInventory(root) {
 const features=definitions.map(([id,engineId,nameEn,nameFa,sources,control,adminTarget])=>{
   const missingSources=sources.filter(rel=>!fs.existsSync(path.join(root,rel)));
   return {id,engineId,nameEn,nameFa,sources,
     sourceState:missingSources.length?'source_incomplete':'source_present',
     missingSources,controlPolicy:control,adminTarget,
     productionState:'not_independently_verified',
     canDisableWithoutApproval:false};
 });
 return {schema:'operations-existing-feature-catalogue-v1',
   generatedAt:new Date().toISOString(),source:'repository_file_presence_only',
   total:features.length,
   limitations:'Feature files demonstrate source presence only. No new engine, automatic redirect, provider access, live revenue, independently validated health or blanket disabling of mandatory security/indexing policies is implied.',
   features};
}
