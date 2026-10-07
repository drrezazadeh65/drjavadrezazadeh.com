import { DurableObject } from "cloudflare:workers";

const ALLOWED_ORIGINS=new Set([
  'https://drjavadrezazadeh.com',
  'https://www.drjavadrezazadeh.com'
]);

const TEST_API='adxcv-zzadq-polkjsad-opp13opoz-1sdf455aadzmck1244567';
const ENDPOINTS={
  test:{
    create:'https://bitpay.ir/payment-test/gateway-send',
    pay:'https://bitpay.ir/payment-test/gateway-{id_get}-get',
    verify:'https://bitpay.ir/payment-test/gateway-result-second'
  },
  production:{
    create:'https://bitpay.ir/payment/gateway-send',
    pay:'https://bitpay.ir/payment/gateway-{id_get}-get',
    verify:'https://bitpay.ir/payment/gateway-result-second'
  }
};

function headers(origin=''){
  const h={
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Robots-Tag':'noindex, nofollow, noarchive',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer'
  };
  if(ALLOWED_ORIGINS.has(origin)){
    h['Access-Control-Allow-Origin']=origin;
    h['Access-Control-Allow-Methods']='GET,POST,OPTIONS';
    h['Access-Control-Allow-Headers']='Content-Type';
    h['Vary']='Origin';
  }
  return h;
}
function json(data,status=200,origin=''){return new Response(JSON.stringify(data),{status,headers:headers(origin)});}
function form(data){return new URLSearchParams(Object.entries(data).filter(([,v])=>v!==undefined&&v!==null&&String(v)!=='').map(([k,v])=>[k,String(v)])).toString();}
function safePath(p){
  const s=String(p||'/fa/shop/checkout/').trim();
  return /^\/(fa|en)\/shop\/checkout\/?(?:[?#].*)?$/.test(s)?s:'/fa/shop/checkout/';
}
function factorId(){
  const a=Date.now().toString();
  const b=crypto.getRandomValues(new Uint32Array(1))[0].toString().slice(-5).padStart(5,'0');
  return a+b;
}
function providerConfig(env,mode){
  if(mode!=='test'&&mode!=='production') throw new Error('invalid_mode');
  const api=mode==='test' ? (env.BITPAY_TEST_API||TEST_API) : env.BITPAY_API;
  if(!api) throw new Error('provider_api_missing');
  return {api,...ENDPOINTS[mode]};
}
async function providerPost(url,data){
  const res=await fetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form(data),redirect:'manual'});
  return {status:res.status,text:(await res.text()).trim()};
}
function parseVerify(text){
  let obj=null;
  try{obj=JSON.parse(text);}catch(e){}
  const status=String(obj?.status??text).trim();
  return {
    verified:status==='1'||status==='11',
    status,
    amount:Number.isInteger(Number(obj?.amount))?Number(obj.amount):null,
    factorId:obj?.factorId!==undefined&&obj?.factorId!==null?String(obj.factorId):null,
    cardNum:obj?.cardNum?String(obj.cardNum):null
  };
}

export class PaymentStore extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);
    this.sql=ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS payment_intent (
      order_id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      amount_rial INTEGER NOT NULL,
      display_amount_toman INTEGER NOT NULL,
      factor_id TEXT NOT NULL,
      id_get TEXT UNIQUE NOT NULL,
      mode TEXT NOT NULL,
      return_path TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_status TEXT,
      trans_id TEXT,
      card_masked TEXT,
      created_at TEXT NOT NULL,
      verified_at TEXT
    )`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS payment_id_get_idx ON payment_intent(id_get)');
  }
  async fetch(request){
    const u=new URL(request.url);
    if(request.method==='POST'&&u.pathname==='/create'){
      const x=await request.json();
      this.sql.exec(`INSERT INTO payment_intent
        (order_id,book_id,quantity,amount_rial,display_amount_toman,factor_id,id_get,mode,return_path,status,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        x.order_id,x.book_id,x.quantity,x.amount_rial,x.display_amount_toman,x.factor_id,x.id_get,x.mode,x.return_path,'PROVIDER_PENDING',x.created_at
      );
      return Response.json({ok:true});
    }
    if(request.method==='GET'&&u.pathname==='/by-id-get'){
      const id=u.searchParams.get('id_get');
      const rows=[...this.sql.exec('SELECT * FROM payment_intent WHERE id_get=? LIMIT 1',id)];
      return Response.json({intent:rows[0]||null});
    }
    if(request.method==='GET'&&u.pathname==='/by-order'){
      const id=u.searchParams.get('order_id');
      const rows=[...this.sql.exec('SELECT * FROM payment_intent WHERE order_id=? LIMIT 1',id)];
      return Response.json({intent:rows[0]||null});
    }
    if(request.method==='POST'&&u.pathname==='/verify'){
      const x=await request.json();
      this.sql.exec(`UPDATE payment_intent
        SET status=?,provider_status=?,trans_id=?,card_masked=?,verified_at=?
        WHERE order_id=?`,
        x.status,x.provider_status,x.trans_id||null,x.card_masked||null,x.verified_at||null,x.order_id
      );
      return Response.json({ok:true});
    }
    return new Response('Not found',{status:404});
  }
}

async function store(env,path,init){
  const id=env.PAYMENT_STORE.idFromName('payments-v1');
  return env.PAYMENT_STORE.get(id).fetch('https://payment-store.internal'+path,init);
}

async function loadBook(env,bookId){
  const origin=(env.PUBLIC_SITE_ORIGIN||'https://drjavadrezazadeh.com').replace(/\/$/,'');
  const res=await fetch(origin+'/platform/book-catalog.json',{cf:{cacheTtl:60,cacheEverything:true}});
  if(!res.ok) throw new Error('catalog_unavailable');
  const data=await res.json();
  const book=(data.books||[]).find(x=>x.id===bookId&&x.commerce?.sellable===true);
  if(!book||!Number.isInteger(book.commerce?.price)||book.commerce.currency!=='IRT') throw new Error('book_not_sellable');
  return book;
}

async function createIntent(request,env,mode,origin){
  let body;
  try{body=await request.json();}catch(e){return json({error:'invalid_json'},400,origin);}
  const quantity=Math.min(20,Math.max(1,Math.trunc(Number(body.quantity)||1)));
  let book;
  try{book=await loadBook(env,String(body.book_id||''));}catch(e){return json({error:e.message},400,origin);}
  const displayAmountToman=book.commerce.price*quantity;
  const amountRial=displayAmountToman*10;
  const orderId=crypto.randomUUID();
  const fId=factorId();
  const returnPath=safePath(body.return_path);
  const cfg=providerConfig(env,mode);
  const paymentsOrigin=(env.PAYMENTS_ORIGIN||new URL(request.url).origin).replace(/\/$/,'');
  const redirect=paymentsOrigin+'/v1/bitpay/callback?mode='+encodeURIComponent(mode);

  const provider=await providerPost(cfg.create,{
    api:cfg.api,
    amount:amountRial,
    redirect,
    factorId:fId,
    description:'Book order '+book.id+' / '+orderId
  });
  if(provider.status!==200||!/^\d+$/.test(provider.text)||Number(provider.text)<=0){
    return json({error:'provider_create_failed',provider_code:provider.text},502,origin);
  }
  const idGet=provider.text;
  await store(env,'/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    order_id:orderId,book_id:book.id,quantity,amount_rial:amountRial,
    display_amount_toman:displayAmountToman,factor_id:fId,id_get:idGet,
    mode,return_path:returnPath,created_at:new Date().toISOString()
  })});
  return json({
    order_id:orderId,
    amount_toman:displayAmountToman,
    amount_rial:amountRial,
    currency:'IRR',
    redirect_url:cfg.pay.replace('{id_get}',idGet),
    test_mode:mode==='test'
  },200,origin);
}

async function callback(request,env){
  const u=new URL(request.url);
  const mode=u.searchParams.get('mode')==='production'?'production':'test';
  const transId=String(u.searchParams.get('trans_id')||'').trim();
  const idGet=String(u.searchParams.get('id_get')||'').trim();
  const site=(env.PUBLIC_SITE_ORIGIN||'https://drjavadrezazadeh.com').replace(/\/$/,'');
  if(!/^\d+$/.test(transId)||!/^\d+$/.test(idGet)){
    return Response.redirect(site+'/fa/shop/checkout/?payment=invalid-callback',303);
  }
  const storedRes=await store(env,'/by-id-get?id_get='+encodeURIComponent(idGet),{method:'GET'});
  const stored=(await storedRes.json()).intent;
  if(!stored||stored.mode!==mode) return Response.redirect(site+'/fa/shop/checkout/?payment=unknown',303);

  const cfg=providerConfig(env,mode);
  const verifiedRes=await providerPost(cfg.verify,{api:cfg.api,trans_id:transId,id_get:idGet,json:1});
  const v=parseVerify(verifiedRes.text);
  const amountOk=v.amount===null||v.amount===stored.amount_rial;
  const factorOk=v.factorId===null||v.factorId===stored.factor_id;
  const ok=v.verified&&amountOk&&factorOk;
  await store(env,'/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    order_id:stored.order_id,
    status:ok?'PAYMENT_VERIFIED':'FAILED',
    provider_status:v.status,
    trans_id:transId,
    card_masked:v.cardNum,
    verified_at:ok?new Date().toISOString():null
  })});
  const target=site+stored.return_path+
    (stored.return_path.includes('?')?'&':'?')+
    'order_id='+encodeURIComponent(stored.order_id)+'&payment='+(ok?'verified':'failed');
  return Response.redirect(target,303);
}

export default {
  async fetch(request,env){
    const u=new URL(request.url);
    const origin=request.headers.get('Origin')||'';
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:headers(origin)});
    if(origin&&!ALLOWED_ORIGINS.has(origin)) return json({error:'origin_not_allowed'},403,origin);

    if(request.method==='GET'&&u.pathname==='/health'){
      return json({status:'ok',service:'payments',mode:env.BITPAY_MODE||'test'},200,origin);
    }
    if(request.method==='POST'&&u.pathname==='/v1/bitpay/test/create'){
      return createIntent(request,env,'test',origin);
    }
    if(request.method==='POST'&&u.pathname==='/v1/bitpay/create'){
      if((env.BITPAY_MODE||'test')!=='production') return json({error:'production_disabled'},503,origin);
      return createIntent(request,env,'production',origin);
    }
    if(request.method==='GET'&&u.pathname==='/v1/bitpay/callback'){
      return callback(request,env);
    }
    if(request.method==='GET'&&u.pathname==='/v1/payments/status'){
      const orderId=String(u.searchParams.get('order_id')||'');
      if(!orderId) return json({error:'order_id_required'},400,origin);
      const storedRes=await store(env,'/by-order?order_id='+encodeURIComponent(orderId),{method:'GET'});
      const stored=(await storedRes.json()).intent;
      if(!stored) return json({error:'not_found'},404,origin);
      return json({
        order_id:stored.order_id,
        status:stored.status,
        amount_toman:stored.display_amount_toman,
        currency:'IRT',
        provider_status:stored.provider_status||null,
        verified_at:stored.verified_at||null
      },200,origin);
    }
    return json({error:'not_found'},404,origin);
  }
};
