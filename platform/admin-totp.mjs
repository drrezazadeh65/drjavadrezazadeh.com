// RFC 6238 TOTP verification for independent administrator MFA.
// Enrollment secrets must be encrypted at rest. Never log secrets or OTPs.
function decodeBase32(value){
 if(typeof value!=='string'||!/^[A-Z2-7]+=*$/i.test(value))throw new Error('Invalid base32 secret');
 const clean=value.toUpperCase().replace(/=+$/,'');let bits=0,buffer=0;const out=[];
 for(const char of clean){const n='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);if(n<0)throw new Error('Invalid base32 secret');buffer=(buffer<<5)|n;bits+=5;if(bits>=8){bits-=8;out.push((buffer>>>bits)&255)}}
 return new Uint8Array(out);
}
async function codeAt(key,counter,digits){
 const bytes=new Uint8Array(8);let n=BigInt(counter);
 for(let i=7;i>=0;i--){bytes[i]=Number(n&255n);n>>=8n}
 const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes));
 const offset=sig[sig.length-1]&15;
 const binary=((sig[offset]&127)<<24)|(sig[offset+1]<<16)|(sig[offset+2]<<8)|sig[offset+3];
 return String(binary%(10**digits)).padStart(digits,'0');
}
export async function verifyAdminTotp({secret,code,now=Date.now(),window=1,digits=6}){
 if(typeof code!=='string'||!/^[0-9]{6}$/.test(code)||digits!==6||!Number.isFinite(now)||window!==1)return false;
 let keyBytes;try{keyBytes=decodeBase32(secret)}catch{return false}
 if(keyBytes.length<20)return false;
 const key=await crypto.subtle.importKey('raw',keyBytes,{name:'HMAC',hash:'SHA-1'},false,['sign']);
 const counter=Math.floor(now/30000);
 let valid=false;
 for(let d=-window;d<=window;d++){if(counter+d<0)continue;const expected=await codeAt(key,counter+d,digits);
  let diff=0;for(let i=0;i<digits;i++)diff|=expected.charCodeAt(i)^code.charCodeAt(i);valid=valid||(diff===0)}
 return valid;
}
