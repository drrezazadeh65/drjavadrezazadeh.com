export const allowedRoles=new Set(['student','parent','teacher','adviser','book']);
export const emailOk=value=>typeof value==='string' && value.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const clean=value=>typeof value==='string'?value.replace(/[\r\n\t]/g,' ').trim():'';
export function validateIntake(data){
  if(!data || typeof data!=='object' || Array.isArray(data)) return null;
  const name=clean(data.name),email=clean(data.email).toLowerCase(),role=data.role;
  if(name.length<2 || name.length>100 || !emailOk(email) || !allowedRoles.has(role)) return null;
  return {name,email,role};
}
