import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const config=JSON.parse(fs.readFileSync('platform/analytics-config.json','utf8'));
const publicConfig=JSON.parse(fs.readFileSync('assets/data/analytics-config.json','utf8'));
const policy=JSON.parse(fs.readFileSync('platform/observability-policy.json','utf8'));
const source=fs.readFileSync('assets/js/analytics-adapter.js','utf8');
const failures=[];
const fail=(condition,message)=>{if(!condition)failures.push(message);};

fail(config.provider==='GA4','GA4 must remain the reporting provider');
fail(config.ga4_property_id==='559754204','GA4 property must be the owner-confirmed property');
fail(config.measurement_id==='G-C3C7NQQNWX','Measurement ID must match the owner-supplied GA4 stream');
fail(config.tag_transport==='GTM_ONLY','GTM is the sole planned tag delivery method');
fail(config.enabled===false||/^GTM-[A-Z0-9]{4,15}$/.test(String(config.gtm_container_id||'')),
 'GA4 cannot activate without a valid owner-provided GTM Web Container ID');
fail(config.enabled===false,'owner has not yet authorised GTM publication or live tag activation');
fail(config.gtm_container_id==='GTM-P6LWCLKM','owner-confirmed GTM container identity mismatch');
fail(config.consent?.required===true,'analytics must require explicit local opt-in');
for(const field of ['schema_version','provider','enabled','measurement_id','tag_transport','gtm_container_id','consent','allowed_client_events','payload_allowlist'])
 fail(JSON.stringify(publicConfig[field])===JSON.stringify(config[field]),'public projection drift: '+field);
fail(config.clarity?.project_id==='z0mzp0dp74','Clarity project must match owner-verified ID');
fail(config.clarity?.enabled===false,'Clarity session recording must stay disabled until masking, opt-in, navigation and GTM Preview pass');
fail(config.clarity?.delivery==='GTM_ONLY','Clarity must only be delivered through the existing GTM container');
fail(config.clarity?.consent?.required===true&&config.clarity?.consent?.separate_from_ga4===true,'Clarity requires separate explicit consent from GA4');
fail(config.clarity?.consent?.storage_key!==config.consent?.storage_key,'Clarity cannot reuse GA4 consent state');
fail(JSON.stringify(config.clarity?.allowlisted_public_routes)===JSON.stringify(['/fa/','/en/']),
 'Clarity requires exact public landing allowlist: no assessments, student portfolios, commerce or forms');
const publicClarity=publicConfig.clarity;
for(const key of ['project_id','enabled','delivery','consent','allowlisted_public_routes'])
 fail(JSON.stringify(publicClarity?.[key])===JSON.stringify(config.clarity?.[key]),'Clarity projection drift: '+key);
fail(!source.includes('https://www.clarity.ms/tag/'),'Clarity must not inject a second direct tracking script');
fail(source.includes("emit('jr_clarity_allowed'"),'Clarity must only fire a separate explicit opt-in GTM event');
fail(source.includes("!document.querySelector('form,input,textarea,[contenteditable]')"),'Clarity must refuse landing pages containing interactive form fields');
fail(!source.includes('/gtag/js'),'standalone gtag.js injection must be removed');
fail(source.includes('/gtm.js?id='),'single GTM Web Container loader required');
fail(source.includes("analytics_storage:'denied'")&&source.includes("analytics_storage:'granted'"),'GTM consent must default denied before opt-in');
fail(source.includes("ad_storage:'denied'")&&source.includes("ad_user_data:'denied'")&&source.includes("ad_personalization:'denied'"),'ad storage must be disabled');
fail(source.includes('page_referrer:\'\''),'manual analytics pageview must suppress potentially sensitive referrer');
fail(source.includes('page_location:PROPERTY_ORIGIN+path'),'page location must exclude URL query parameters');
fail(source.includes("location.search==='string'")&&source.includes("location.hash==='string'"),'any query or fragment must prevent loading GTM, including automatic tag events');
fail(source.includes("JR_CONVERSION_INTENT"),'reuse existing semantic conversion intent bus');
fail(source.includes('JRAnalyticsConsent'),'existing consent API must be preserved');
fail(!source.includes("window.JRAnalytics.purchase"),'browser cannot emit unverified purchase events');
for(const token of ['email','phone','message','assessment','document','payment'])
 fail(config.prohibited_payload.join(' ').toLowerCase().includes(token),'prohibited analytics payload policy missing '+token);
const policyEvents=new Set((policy.events||[]).filter(x=>x.client_event===true).map(x=>x.key));
for(const key of config.allowed_client_events||[])
 fail(policyEvents.has(key),'unregistered browser intent: '+key);
fail(policy.rules?.raw_form_values_in_analytics===false,'raw form values must remain excluded');
if(failures.length){failures.forEach(x=>console.error('✗ '+x));process.exit(1);}
execFileSync(process.execPath,['--test','tests/analytics-consent-lifecycle.test.mjs'],{stdio:'inherit'});
console.log('GTM/GA4 analytics contract verified offline: tag transport remains disabled pending owner tag setup, preview and publish approval; consent and sensitive-route guards tested.');
