/** Pure metadata layer. Uploads must be handled by an authenticated backend. */
export const MEDIA_TYPES=Object.freeze(['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']);
const ID=/^[a-z0-9][a-z0-9_-]{2,100}$/;
export function validateMediaRecord(record){
 if(!record||typeof record!=='object'||Array.isArray(record))throw new TypeError('Invalid media record');
 if(!ID.test(record.id||''))throw new Error('Invalid stable media ID');
 if(!MEDIA_TYPES.includes(record.mime))throw new Error('Unsupported image MIME');
 if(typeof record.altFa!=='string'||!record.altFa.trim())throw new Error('Persian alt text required');
 if(typeof record.altEn!=='string'||!record.altEn.trim())throw new Error('English alt text required');
 if(!['owned','licensed','public-domain'].includes(record.rights))throw new Error('Image rights status required');
 if(!Number.isSafeInteger(record.bytes)||record.bytes<=0||record.bytes>20*1024*1024)throw new Error('Invalid file size');
 if(!Number.isInteger(record.width)||record.width<=0||!Number.isInteger(record.height)||record.height<=0)throw new Error('Invalid dimensions');
 return Object.freeze({id:record.id,mime:record.mime,altFa:record.altFa.trim(),altEn:record.altEn.trim(),rights:record.rights,bytes:record.bytes,width:record.width,height:record.height,tags:Array.isArray(record.tags)?record.tags.filter(x=>typeof x==='string').slice(0,30):[]});
}
export function planImageDerivatives(record){
 const media=validateMediaRecord(record);
 if(media.mime==='image/svg+xml')return Object.freeze([]);
 return Object.freeze([320,640,960,1440].filter(w=>w<=media.width).map(width=>({width,height:Math.max(1,Math.round(media.height*width/media.width)),format:'webp'})));
}
export function canDeleteMedia(id,references=[]){
 if(!ID.test(id))throw new Error('Invalid media ID');
 return !references.some(ref=>ref&&ref.mediaId===id);
}
