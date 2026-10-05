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
      startLink=el("dashStartLink");

const routeCode=String(s.routeCode||s.route||"").toUpperCase();
const routeLabel=String(s.routeLabel||"");
const hasValidRoute=allowedRoutes.has(routeCode);

if(stage)stage.textContent="RCAS Start تکمیل شد";
if(progress)progress.textContent="۲۵٪";
if(next)next.textContent=hasValidRoute ? routeCode+(routeLabel?" · "+routeLabel:"") : "نیازمند بازبینی Routing";
if(meter)meter.style.width="100%";

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