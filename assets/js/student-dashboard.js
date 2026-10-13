(()=>{
const el=id=>document.getElementById(id);
const allowedRoutes=new Set(["D1","D2","D3","D4","D5","D6"]);
let s=null;
try{s=JSON.parse(sessionStorage.getItem("gt_rcas_state")||"null")}catch(e){}
if(!s||s.completed!==true||s.rcasRevision!=="start-1.1"||s.completedItemCount!==28||s.routeBasis!=="SELF_SELECTED_UNVALIDATED")return;

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
if(stage)stage.textContent="RCAS Start · خودارزیابی مقدماتی تکمیل شد";
if(progress)progress.textContent="۲۵٪";
if(next)next.textContent=hasValidRoute ? routeCode+(routeLabel?" · "+routeLabel:"") : "نیازمند بازبینی Routing";
if(meter)meter.style.width="100%";
if(nextActionTitle)nextActionTitle.textContent=hasValidRoute
  ? "مرحله بعدی: "+routeCode+(routeLabel?" · "+routeLabel:"")
  : "Routing را بازبینی کن تا مسیر بعدی معتبر مشخص شود.";
if(nextActionText)nextActionText.textContent=hasValidRoute
  ? "این حوزه را خود یادگیرنده انتخاب کرده است؛ پاسخ‌های Core 28 هنوز با یک موتور معتبر تحلیل یا هنجار سنجش تفسیر نشده‌اند. مرحله بعد، گردآوری شواهد و در صورت نیاز بررسی حرفه‌ای است."
  : "RCAS تکمیل شده است، اما مسیر D1 تا D6 معتبر در این نشست پیدا نشد.";
if(nextActionLink){
  nextActionLink.href=hasValidRoute?"./modules/"+routeCode.toLowerCase()+"/":"../../assessments/golden-talent/start/";
  nextActionLink.textContent=hasValidRoute?"پیش‌نمایش ماژول "+routeCode:"بازبینی RCAS";
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

if(startLink)startLink.textContent="بازبینی یا آغاز دوباره RCAS Start ←";

document.querySelectorAll("[data-core-state]").forEach(x=>{
  x.textContent="Core 28 در نشست فعلی پاسخ داده شد؛ صرفاً کد حوزه خودانتخابی ذخیره شده است، نه نمره یا پاسخ‌های خام";
});
})();