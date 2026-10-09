/** Conversion job planner. Actual encoding requires a trusted image processing worker. */
const FORMATS=new Set(['avif','webp','jpeg']);
export function planImageConversions({width,height,mime,animated=false,quality={avif:48,webp:76,jpeg:82}}={}){
 if(!Number.isSafeInteger(width)||width<1||width>16000||!Number.isSafeInteger(height)||height<1||height>16000)throw new Error('Invalid image dimensions');
 if(!['image/jpeg','image/png','image/webp','image/avif'].includes(mime))throw new Error('Unsupported input format');
 if(animated)throw new Error('Animated image conversion requires separate review');
 const widths=[320,480,768,1024,1440,1920].filter(x=>x<width);
 widths.push(width);
 const jobs=[];
 for(const format of FORMATS){
  const q=quality[format];if(!Number.isInteger(q)||q<1||q>100)throw new Error('Invalid quality');
  for(const w of widths)jobs.push(Object.freeze({format,width:w,height:Math.max(1,Math.round(height*w/width)),quality:q,stripMetadata:true}));
 }
 return Object.freeze(jobs);
}
export function responsivePictureSources(jobs,basePath){
 if(typeof basePath!=='string'||!/^[a-z0-9/_-]+$/i.test(basePath)||basePath.includes('..'))throw new Error('Invalid asset base path');
 return ['avif','webp','jpeg'].map(format=>({type:'image/'+format,srcset:jobs.filter(x=>x.format===format).map(x=>basePath+'-'+x.width+'.'+format+' '+x.width+'w').join(', ')}));
}
