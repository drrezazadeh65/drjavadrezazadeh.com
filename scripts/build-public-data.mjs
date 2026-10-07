import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,obj)=>fs.writeFileSync(path.join(root,p),JSON.stringify(obj,null,2)+'\n','utf8');

const book=read('platform/book-catalog.json');
const service=read('platform/service-catalog.json');
const analytics=read('platform/analytics-config.json');

const outputs={
  'assets/data/book-catalog.json':{
    schema_version:book.schema_version,
    books:(book.books||[]).map(b=>({
      id:b.id,
      slug:b.slug,
      title_fa:b.title_fa,
      english_reference_title:b.english_reference_title,
      author:b.author,
      publication_status:b.publication_status,
      description_fa:b.description_fa,
      description_en:b.description_en,
      bibliography:b.bibliography,
      commerce:{
        sellable:b.commerce?.sellable===true,
        price:b.commerce?.price,
        currency:b.commerce?.currency,
        inventory_state:b.commerce?.inventory_state,
        formats_confirmed:b.commerce?.formats_confirmed||[],
        shipping_required:b.commerce?.shipping_required===true
      }
    }))
  },
  'assets/data/service-catalog.json':{
    schema_version:service.schema_version,
    version:service.version,
    currency:service.currency,
    services:(service.services||[]).map(s=>({
      id:s.id,
      title_fa:s.title_fa,
      duration_minutes:s.duration_minutes,
      price:s.price,
      sellable:s.sellable===true,
      fit_fa:s.fit_fa,
      outcome_fa:s.outcome_fa,
      boundary_fa:s.boundary_fa
    }))
  },
  'assets/data/analytics-config.json':{
    schema_version:analytics.schema_version,
    provider:analytics.provider,
    enabled:analytics.enabled===true,
    measurement_id:analytics.measurement_id||null,
    consent:analytics.consent,
    allowed_client_events:analytics.allowed_client_events||[],
    payload_allowlist:analytics.payload_allowlist||[]
  }
};

let drift=false;
for(const [rel,obj] of Object.entries(outputs)){
  const expected=JSON.stringify(obj,null,2)+'\n';
  const absolute=path.join(root,rel);
  if(process.argv.includes('--check')){
    const actual=fs.existsSync(absolute)?fs.readFileSync(absolute,'utf8'):'';
    if(actual!==expected){
      console.error('✗ Public data projection drift: '+rel);
      drift=true;
    }
  }else{
    fs.mkdirSync(path.dirname(absolute),{recursive:true});
    write(rel,obj);
    console.log('Generated '+rel);
  }
}
if(drift) process.exit(1);
if(process.argv.includes('--check')) console.log('Public data projections match canonical sources.');
