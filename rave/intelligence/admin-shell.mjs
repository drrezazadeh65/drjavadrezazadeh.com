/** RAVE admin shell: framework-neutral, no customer data or credentials. */
export const MODULES = Object.freeze([
  {id:'overview',fa:'نمای کلی',en:'Overview',permission:'dashboard.read'},
  {id:'seo',fa:'مستر سئو',en:'Master SEO',permission:'seo.read'},
  {id:'rave',fa:'راو',en:'RAVE',permission:'rave.read'},
  {id:'golden-talent',fa:'گلدن تلنت',en:'Golden Talent',permission:'talent.read'},
  {id:'commerce',fa:'فروشگاه و مالی',en:'Commerce & Finance',permission:'commerce.read'},
  {id:'crm',fa:'مشتریان',en:'CRM',permission:'crm.read'},
  {id:'content',fa:'مدیریت محتوا',en:'Content',permission:'content.read'},
  {id:'media',fa:'رسانه',en:'Media',permission:'media.read'},
  {id:'design',fa:'استودیوی طراحی',en:'Design Studio',permission:'design.read'},
  {id:'operations',fa:'تنظیمات و عملیات',en:'Operations',permission:'operations.read'}
]);
export function visibleModules(permissions = [], locale = 'fa') {
  const granted = new Set(permissions);
  return MODULES.filter(m => granted.has(m.permission)).map(m => ({id:m.id,label:locale==='en'?m.en:m.fa}));
}
export function validateDashboardWidget(widget) {
  if (!widget || typeof widget !== 'object' || Array.isArray(widget)) throw new TypeError('Invalid widget');
  if (!MODULES.some(m=>m.id===widget.module)) throw new Error('Unknown engine');
  if (typeof widget.title !== 'string' || !widget.title.trim()) throw new Error('Missing title');
  if (!['number','bar','line','table','status'].includes(widget.type)) throw new Error('Unsupported widget type');
  if (!['live','delayed','unavailable'].includes(widget.freshness)) throw new Error('Missing data freshness');
  if (widget.freshness !== 'unavailable' && (!widget.source || typeof widget.source !== 'string')) throw new Error('Missing source provenance');
  return Object.freeze({module:widget.module,title:widget.title,type:widget.type,freshness:widget.freshness,source:widget.source??null});
}
export function createDashboardShell({locale='fa',permissions=[],widgets=[]}={}) {
  if (!['fa','en'].includes(locale)) throw new Error('Unsupported locale');
  const modules=visibleModules(permissions,locale);
  const accessible=new Set(modules.map(m=>m.id));
  const safeWidgets=widgets.map(validateDashboardWidget).filter(w=>accessible.has(w.module));
  return {locale,dir:locale==='fa'?'rtl':'ltr',modules,widgets:safeWidgets,authenticatedRequired:true,readOnly:true};
}
