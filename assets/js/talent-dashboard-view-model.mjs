/**
 * Presentation-only adapter. The PHP API must authenticate/authorise/protect
 * its inputs first. This is a preproduction view model, not wired to a page.
 */
export const TALENT_VIEW_MODEL_VERSION = '1.0.0-preproduction';
const ordered = ['GOLDEN_TALENT','RCAS','BAHAR'];
const stages = {GOLDEN_TALENT:'ORIENTATION',RCAS:'CONTEXT_REFLECTION',BAHAR:'STARTER_PLAN'};
const states = new Set(['NOT_STARTED','IN_PROGRESS','COMPLETED','PAUSED','UNKNOWN']);
const copy = {
  fa:{
    names:{GOLDEN_TALENT:'استعداد طلایی',RCAS:'بازاندیشی زمینه‌ای RCAS',BAHAR:'مسیر رشد BAHAR'},
    states:{NOT_STARTED:'هنوز آغاز نشده',IN_PROGRESS:'در حال انجام',COMPLETED:'پایان مرحله ثبت شده است',PAUSED:'موقتاً متوقف',UNKNOWN:'وضعیت هنوز تأیید نشده است'},
    report:'گزارش تخصصی هنوز به این پنل متصل نیست',
    scientific:'این مرحله پژوهشی است و نمره تشخیصی یا استعداد قطعی ارائه نمی‌کند',
    paid:'دسترسی تکمیلی هنوز تأیید نشده است'
  },
  en:{
    names:{GOLDEN_TALENT:'Golden Talent',RCAS:'RCAS contextual reflection',BAHAR:'BAHAR development pathway'},
    states:{NOT_STARTED:'Not started',IN_PROGRESS:'In progress',COMPLETED:'Stage completion recorded',PAUSED:'Temporarily paused',UNKNOWN:'Status has not been verified'},
    report:'Professional reports are not yet connected to this dashboard',
    scientific:'This is a research-stage reflection, not a diagnostic or definitive talent score',
    paid:'Additional access has not been verified'
  }
};
const invalid = () => Object.freeze({verified:false,cards:[]});
export function talentCustomerCards(response,locale='fa') {
  if(!response || response.ok!==true || response.schema!=='talent-customer-overview-v1' ||
     response.hasPrivateEvidence!==false || response.normativeScoresAvailable!==false ||
     response.reportDownloadAvailable!==false ||
     !['VERIFIED_SELF','VERIFIED_GUARDIAN'].includes(response.viewerScope) ||
     !Array.isArray(response.modules) || response.modules.length!==3 || !['fa','en'].includes(locale))
    return invalid();
  const language=copy[locale];
  const cards=[];
  for (let i=0;i<ordered.length;i++) {
    const module=response.modules[i];
    if (!module || module.module!==ordered[i] ||
        module.freeStage?.code!==stages[module.module] ||
        !states.has(module.freeStage?.state) ||
        module.freeStage.paymentRequired!==false ||
        module.paidStage?.state!=='NOT_VERIFIED' ||
        module.report?.state!=='NOT_CONNECTED' ||
        module.report?.scientificStatus!=='PREVALIDATION')return invalid();
    cards.push(Object.freeze({
      code:module.module,title:language.names[module.module],
      stageCode:stages[module.module],stageState:module.freeStage.state,
      stageLabel:language.states[module.freeStage.state],
      reportNote:language.report,scientificNote:language.scientific,
      paidNote:language.paid,canDownloadReport:false,canStartPaid:false
    }));
  }
  return Object.freeze({verified:true,cards:Object.freeze(cards)});
}
