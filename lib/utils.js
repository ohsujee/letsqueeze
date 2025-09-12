export function genCode(len=6){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O,I,0,1
  let s=""; for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
export function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
