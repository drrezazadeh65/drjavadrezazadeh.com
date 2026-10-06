const ALLOWED_ORIGINS=new Set([
  'https://drjavadrezazadeh.com',
  'https://www.drjavadrezazadeh.com',
  'https://drrezazadeh65.github.io'
]);

const SYSTEM_PROMPT=`You are the public AI concierge for Dr. Javad Rezazadeh Yazdeli's official website.
Identity and scope:
- You are an AI assistant, not Dr. Rezazadeh and not a human administrator.
- Answer in the user's language, normally Persian or English.
- Use the APPROVED SITE CONTEXT below as the primary factual basis for site-specific claims.
- If a site-specific fact is not supported by the context, say that you cannot verify it and guide the user to the relevant public page or consultation route.
Safety and integrity:
- Never request or retain identity documents, medical records, passwords, payment/card data, or other sensitive personal information.
- Do not claim access to private accounts, student records, assessment answers, payments, bookings, or unpublished material.
- Do not reveal or discuss confidential/unreleased projects or internal repository content.
- Never invent prices, publication status, credentials, affiliations, scientific validation, test scores, talent rankings, giftedness labels, or career certainty.
- Golden Talent is developmental and multi-source; do not produce a total talent score, normative label, deterministic major/career prescription, or clinical diagnosis.
- For high-consequence personal decisions, explain the limitation and recommend human consultation where appropriate.
Navigation and conversion:
- Be genuinely helpful before recommending a service.
- When useful, point to a public page from the provided context.
- Keep answers concise, clear and practical; usually 2–5 short paragraphs.
- Do not use markdown tables.
`;

function cors(origin){
  const allow=ALLOWED_ORIGINS.has(origin||'')?origin:'https://drjavadrezazadeh.com';
  return {
    'Access-Control-Allow-Origin':allow,
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type,X-JR-Visitor',
    'Access-Control-Max-Age':'86400',
    'Vary':'Origin',
    'Cache-Control':'no-store',
    'X-Robots-Tag':'noindex, nofollow, noarchive',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer'
  };
}
function json(data,status,origin){
  return new Response(JSON.stringify(data),{status,headers:{...cors(origin),'Content-Type':'application/json; charset=utf-8'}});
}
function compact(s,n=1800){return String(s??'').replace(/\s+/g,' ').trim().slice(0,n);}
function tokens(s){
  return compact(s,2200).toLowerCase().normalize('NFKC').split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>1);
}
function rankDocs(query,docs,lang){
  const q=tokens(query),set=new Set(q);
  return (Array.isArray(docs)?docs:[]).filter(d=>!lang||d.lang===lang).map(d=>{
    const hay=(String(d.title||'')+' '+String(d.summary||'')+' '+String(d.keywords||'')+' '+String(d.category||'')).toLowerCase();
    let score=0;
    for(const t of set) if(hay.includes(t)) score+=hay.startsWith(t)?4:2;
    if(d.lang===lang) score+=1;
    return {d,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,7).map(x=>x.d);
}
async function loadIndex(env){
  const origin=(env.PUBLIC_SITE_ORIGIN||'https://drrezazadeh65.github.io/drjavadrezazadeh.com').replace(/\/$/,'');
  const url=origin+'/assets/search-index.json';
  const res=await fetch(url,{cf:{cacheTtl:300,cacheEverything:true}});
  if(!res.ok) return [];
  try{return await res.json();}catch(e){return [];}
}
function linksFromDocs(docs,env){
  const origin=(env.PUBLIC_SITE_ORIGIN||'https://drrezazadeh65.github.io/drjavadrezazadeh.com').replace(/\/$/,'');
  return docs.slice(0,4).map(d=>({label:compact(d.title,80),url:origin+'/'+String(d.path||'').replace(/^\//,'')}));
}
function modelText(result){
  if(typeof result==='string') return result;
  if(typeof result?.response==='string') return result.response;
  if(typeof result?.output_text==='string') return result.output_text;
  const choice=result?.choices?.[0]?.message?.content;
  if(typeof choice==='string') return choice;
  if(Array.isArray(choice)) return choice.map(x=>x?.text||x?.content||'').join('');
  return '';
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const origin=request.headers.get('Origin')||'';
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors(origin)});
    if(origin && !ALLOWED_ORIGINS.has(origin)) return json({error:'origin_not_allowed'},403,origin);

    if(request.method==='GET'&&url.pathname==='/health'){
      return json({status:'ok',service:'site-assistant'},200,origin);
    }
    if(request.method!=='POST'||url.pathname!=='/v1/chat') return json({error:'not_found'},404,origin);

    let body;
    try{body=await request.json();}catch(e){return json({error:'invalid_json'},400,origin);}
    const message=compact(body?.message,1600);
    if(!message) return json({error:'message_required'},400,origin);

    const visitor=compact(request.headers.get('X-JR-Visitor')||'anonymous',100);
    if(env.ASSISTANT_RATE_LIMITER){
      const rate=await env.ASSISTANT_RATE_LIMITER.limit({key:'public:'+visitor});
      if(!rate.success) return json({error:'rate_limited',answer:body?.page?.lang==='fa'?'تعداد درخواست‌ها زیاد شده است. لطفاً یک دقیقه بعد دوباره تلاش کنید.':'Too many requests. Please try again in a minute.'},429,origin);
    }

    const lang=body?.page?.lang==='fa'?'fa':'en';
    const docs=rankDocs(message,await loadIndex(env),lang);
    const context=docs.length?docs.map((d,i)=>`[${i+1}] ${compact(d.title,120)} — ${compact(d.summary,260)} — path: /${String(d.path||'').replace(/^\//,'')}`).join('\n'):'No matching approved site context was found.';
    const history=(Array.isArray(body?.history)?body.history:[]).slice(-8).map(x=>({
      role:x?.role==='assistant'?'assistant':'user',
      content:compact(x?.content,1600)
    })).filter(x=>x.content);

    const messages=[
      {role:'system',content:SYSTEM_PROMPT+'\n\nAPPROVED SITE CONTEXT:\n'+context},
      ...history,
      {role:'user',content:message}
    ];
    const model=env.ASSISTANT_MODEL||'@cf/openai/gpt-oss-120b';
    try{
      const options=model.startsWith('openai/')&&env.AI_GATEWAY_ID?{gateway:{id:env.AI_GATEWAY_ID}}:undefined;
      const result=options
        ? await env.AI.run(model,{messages,max_tokens:650,temperature:0.35},options)
        : await env.AI.run(model,{messages,max_tokens:650,temperature:0.35});
      const answer=compact(modelText(result),4200);
      if(!answer) throw new Error('empty_model_response');
      return json({answer,links:linksFromDocs(docs,env),model_class:model.startsWith('@cf/openai/gpt-oss')?'openai-open-weight':'configured'},200,origin);
    }catch(e){
      return json({
        error:'assistant_unavailable',
        answer:lang==='fa'
          ?'در حال حاضر پاسخ هوشمند موقتاً در دسترس نیست. از لینک‌های پیشنهادی استفاده کنید یا کمی بعد دوباره تلاش کنید.'
          :'The AI response is temporarily unavailable. Please use the suggested links or try again shortly.',
        links:linksFromDocs(docs,env)
      },503,origin);
    }
  }
};
