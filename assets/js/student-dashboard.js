(()=>{
const el=id=>document.getElementById(id);
const allowedRoutes=new Set(["D1","D2","D3","D4","D5","D6"]);
let s=null;
try{s=JSON.parse(sessionStorage.getItem("gt_rcas_state")||"null")}catch(e){}
if(!s||!s.completed)return;

const stage=el("dashStage"),
      progress=el("dashProgress"),
      next=el("dashNext"),
      meter=el("dashMeter"),
      route=el("dashRoute"),
      routeText=el("dashRouteText"),
      startLink=el("dashStartLink"),
      nextActionTitle=el("dashNextActionTitle"),
      nextActionText=el("dashNextActionText"),
      nextActionLink=el("dashNextActionLink");

const routeCode=String(s.routeCode||s.route||"").toUpperCase();
const routeLabel=String(s.routeLabel||"");
const hasValidRoute=allowedRoutes.has(routeCode);

document.querySelector('[data-onboard="rcas"]')?.classList.add('is-complete');
document.querySelector('[data-onboard="route"]')?.classList.add(hasValidRoute?'is-complete':'is-current');
if(hasValidRoute)document.querySelector('[data-onboard="path"]')?.classList.add('is-current');
if(stage)stage.textContent="RCAS Start تکمیل شد";
if(progress)progress.textContent="۲۵٪";
if(next)next.textContent=hasValidRoute ? routeCode+(routeLabel?" · "+routeLabel:"") : "نیازمند بازبینی Routing";
if(meter)meter.style.width="100%";
if(nextActionTitle)nextActionTitle.textContent=hasValidRoute
  ? "مرحله بعدی: "+routeCode+(routeLabel?" · "+routeLabel:"")
  : "Routing را بازبینی کن تا مسیر بعدی معتبر مشخص شود.";
if(nextActionText)nextActionText.textContent=hasValidRoute
  ? "این پیشنهاد برچسب یا تشخیص نیست؛ فقط نشان می‌دهد تولید شواهد بیشتر در این حوزه می‌تواند تصمیم بعدی را بهتر کند."
  : "RCAS تکمیل شده است، اما مسیر D1 تا D6 معتبر در این نشست پیدا نشد.";
if(nextActionLink){
  nextActionLink.href=hasValidRoute?"./modules/"+routeCode.toLowerCase()+"/":"../../assessments/golden-talent/start/";
  nextActionLink.textContent=hasValidRoute?"بازکردن "+routeCode:"بازبینی RCAS";
}

if(route){
  route.hidden=false;
  if(routeText)routeText.textContent=hasValidRoute
    ? routeCode+(routeLabel?" · "+routeLabel:"")
    : "Routing تکمیل شده است، اما مسیر پیشنهادی معتبر D1 تا D6 در این نشست یافت نشد.";

  const a=el("dashRecommendedModule");
  if(a){
    if(hasValidRoute){
      a.href="./modules/"+routeCode.toLowerCase()+"/";
      a.textContent="پیش‌نمایش "+routeCode+" ←";
    }else{
      a.href="../../assessments/golden-talent/start/";
      a.textContent="بازبینی Routing ←";
    }
  }
}

if(startLink)startLink.textContent="بازبینی RCAS Start ←";

document.querySelectorAll("[data-core-state]").forEach(x=>{
  x.textContent="RCAS در این نشست تکمیل شد؛ پاسخ‌های خام ذخیره نشده‌اند";
});
})();