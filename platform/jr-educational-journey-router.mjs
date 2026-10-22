/**
 * JR Education Journey Router v1 — deterministic, privacy-preserving routing.
 * Does not perform diagnosis, ranking, payment, admission prediction or profiling.
 * Accepts a declared need only; never stores user input.
 */
export const JOURNEY_ROUTER_VERSION = '1.0.0';
export const JOURNEY_NEEDS = Object.freeze({
  talent: Object.freeze({fa:'استعداد من چیست؟',en:'What am I good at?',path:'/fa/golden-talent/',engine:'golden-talent',stage:'explore'}),
  study: Object.freeze({fa:'چگونه بهتر درس بخوانم؟',en:'How should I study?',path:'/fa/moshavere-tahsili/',engine:'bahar',stage:'explore'}),
  scorecard: Object.freeze({fa:'کارنامه‌ام را بررسی کنم',en:'Review my scorecard',path:'/fa/konkur-ai-lab/',engine:'admission-intelligence',stage:'research'}),
  admission: Object.freeze({fa:'گزینه‌های دانشگاهی را بررسی کنم',en:'Explore university choices',path:'/fa/entekhab-reshteh/',engine:'admission-intelligence',stage:'official-source-required'}),
  compare: Object.freeze({fa:'دو مسیر را مقایسه کنم',en:'Compare two study paths',path:'/fa/entekhab-reshteh/',engine:'choice-studio',stage:'descriptive'}),
  growth: Object.freeze({fa:'برای رشدم برنامه بسازم',en:'Build my development pathway',path:'/fa/golden-talent/',engine:'golden-path',stage:'explore'})
});
const VALID = new Set(Object.keys(JOURNEY_NEEDS));
export function routeEducationalNeed(need, {language='fa'}={}) {
  if (typeof need !== 'string' || !VALID.has(need)) return Object.freeze({ok:false,reason:'unknown-need'});
  const item=JOURNEY_NEEDS[need];
  return Object.freeze({
    ok:true,need,engine:item.engine,stage:item.stage,href:item.path,
    label:language==='en'?item.en:item.fa,
    predictive:false,
    needsOfficialSource:item.stage==='official-source-required',
    consentBeforeSensitiveInput:true
  });
}
export function listEducationalJourneys(language='fa') {
  return Object.freeze(Object.keys(JOURNEY_NEEDS).map(need=>routeEducationalNeed(need,{language})));
}
