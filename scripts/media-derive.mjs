import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let sharp;
try {
  ({default:sharp}=await import('sharp'));
} catch {
  console.error('media-derive requires sharp. Install for the current run with: npm install --no-save sharp');
  process.exit(2);
}

const root=process.cwd();
const argv=process.argv.slice(2);
const args={};
for(let i=0;i<argv.length;i++){
  const token=argv[i];
  if(!token.startsWith('--')) continue;
  const key=token.slice(2);
  const next=argv[i+1];
  if(next && !next.startsWith('--')) { args[key]=next; i++; }
  else args[key]=true;
}

function fail(message){ console.error('✗ '+message); process.exit(1); }
function rel(p){ return path.relative(root,p).replaceAll(path.sep,'/'); }
function splitCsv(value){ return String(value||'').split(',').map(x=>x.trim()).filter(Boolean); }

if(!args.input) fail('Missing --input <repository path>.');
const inputPath=path.resolve(root,String(args.input));
if(!inputPath.startsWith(root+path.sep)) fail('Input must remain inside the repository.');
if(!fs.existsSync(inputPath)) fail('Input does not exist: '+rel(inputPath));

const registryPath=path.join(root,'assets','media-registry.json');
const registry=JSON.parse(fs.readFileSync(registryPath,'utf8'));
const inputRel=rel(inputPath);
const source=(registry.assets||[]).find(x=>x.path===inputRel);
if(!source) fail('Source is not registered in assets/media-registry.json: '+inputRel);
if(source.composition_locked && args.crop) fail('Composition-locked assets cannot be cropped.');

const meta=await sharp(inputPath,{failOn:'error'}).metadata();
if(!meta.width||!meta.height) fail('Unable to determine source dimensions.');
const widths=(splitCsv(args.widths||String(meta.width))
  .map(Number)
  .filter(Number.isFinite)
  .map(Math.round)
  .filter(w=>w>=64 && w<=4096));
if(!widths.length) fail('No valid widths. Use --widths 640,960,1280.');
const uniqueWidths=[...new Set(widths)].sort((a,b)=>a-b);
const allowUpscale=args['allow-upscale']===true || args['allow-upscale']==='true';
if(!allowUpscale && uniqueWidths.some(w=>w>meta.width)){
  fail('Requested width exceeds source width '+meta.width+'. Upscaling is blocked by default.');
}

const formats=splitCsv(args.formats||'webp,avif').map(x=>x.toLowerCase());
const allowed=new Set(['webp','avif','jpeg','jpg','png']);
for(const f of formats) if(!allowed.has(f)) fail('Unsupported format: '+f);

const quality=Math.max(50,Math.min(100,Number(args.quality||88)));
const outDir=path.resolve(root,String(args['out-dir']||path.dirname(inputRel)));
if(!outDir.startsWith(root+path.sep)) fail('Output directory must remain inside repository.');
fs.mkdirSync(outDir,{recursive:true});

const parsed=path.parse(inputRel);
const basename=String(args.basename||parsed.name).replace(/[^0-9A-Za-z._-]+/g,'-').replace(/^-+|-+$/g,'');
if(!basename) fail('Invalid output basename.');

const generated=[];
for(const width of uniqueWidths){
  for(const requestedFormat of formats){
    const format=requestedFormat==='jpg'?'jpeg':requestedFormat;
    const ext=format==='jpeg'?'jpg':format;
    const outputPath=path.join(outDir,`${basename}-${width}w.${ext}`);
    if(path.resolve(outputPath)===inputPath) fail('Refusing to overwrite the source asset.');

    let pipeline=sharp(inputPath,{failOn:'error'}).rotate().resize({
      width,
      withoutEnlargement:!allowUpscale,
      fit:'inside'
    });
    if(format==='webp') pipeline=pipeline.webp({quality,effort:5,smartSubsample:true});
    else if(format==='avif') pipeline=pipeline.avif({quality,effort:6,chromaSubsampling:'4:4:4'});
    else if(format==='jpeg') pipeline=pipeline.jpeg({quality,mozjpeg:true});
    else if(format==='png') pipeline=pipeline.png({compressionLevel:9,palette:false});

    await pipeline.toFile(outputPath);
    const outMeta=await sharp(outputPath).metadata();
    const bytes=fs.statSync(outputPath).size;
    const digest=crypto.createHash('sha256').update(fs.readFileSync(outputPath)).digest('hex');

    const record={
      path:rel(outputPath),
      kind:source.kind,
      role:source.role,
      provenance:`Deterministic web derivative of ${inputRel}`,
      rights:source.rights,
      alt_en:source.alt_en,
      alt_fa:source.alt_fa,
      caption_en:source.caption_en||source.alt_en,
      caption_fa:source.caption_fa||source.alt_fa,
      source_asset:inputRel,
      source_status:'production-derivative',
      mime_type:outMeta.format==='jpeg'?'image/jpeg':'image/'+outMeta.format,
      width:outMeta.width,
      height:outMeta.height,
      composition_locked:source.composition_locked===true,
      optimization_profile:source.optimization_profile||String(args.profile||'web-responsive'),
      generated_by:'scripts/media-derive.mjs',
      sha256:digest
    };

    const idx=(registry.assets||[]).findIndex(x=>x.path===record.path);
    if(idx>=0) registry.assets[idx]=record;
    else registry.assets.push(record);
    generated.push({path:record.path,width:record.width,height:record.height,bytes,sha256:digest});
  }
}

registry.version=new Date().toISOString().slice(0,10)+'-v4.3.0';
registry.assets.sort((a,b)=>String(a.path).localeCompare(String(b.path),'en'));
fs.writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n','utf8');

console.log(JSON.stringify({
  source:{path:inputRel,width:meta.width,height:meta.height,composition_locked:source.composition_locked===true},
  generated,
  registry:'assets/media-registry.json'
},null,2));
