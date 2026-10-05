(()=>{
const el=id=>document.getElementById(id);
let s=null;try{s=JSON.parse(sessionStorage.getItem("gt_rcas_state")||"null")}catch(e){}
if(!s||!s.completed)return;
const stage=el("dashStage"),progress=el("dashProgress"),next=el("dashNext"),meter=el("dashMeter"),route=el("dashRoute"),routeText=el("dashRouteText"),startLink=el("dashStartLink");
if(stage)stage.textContent="RCAS Start تکمیل شد";
if(progress)progress.textContent="۲۵٪";
if(next)next.textContent=s.routeCode+" · "+s.routeLabel;
if(meter)meter.style.width="100%";
if(route){route.hidden=false;if(routeText)routeText.textContent=s.routeCode+" · "+s.routeLabel;const a=document.getElementById("dashRecommendedModule");if(a){a.href="./modules/"+String(s.route||"").toLowerCase()+"/";a.textContent="پیش‌نمایش "+s.routeCode+" ←"}}
if(startLink)startLink.textContent="بازبینی RCAS Start ←";
document.querySelectorAll("[data-core-state]").forEach(x=>x.textContent="پاسخ ثبت شد در همین نشست");
})();