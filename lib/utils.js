import { db, ref, get } from '@/lib/firebase';
import { ROOM_TYPES } from '@/lib/config/rooms';

export function genCode(len=6){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O,I,0,1
  let s=""; for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}

/**
 * Check if a room code is already used in any game type
 * @param {string} code - The room code to check
 * @returns {Promise<boolean>} - True if code is already used
 */
export async function isCodeUsed(code) {
  for (const roomType of ROOM_TYPES) {
    const snapshot = await get(ref(db, `${roomType.prefix}/${code}/meta`));
    if (snapshot.exists()) {
      return true;
    }
  }
  return false;
}

/**
 * Generate a unique room code that doesn't exist in any game type
 * @param {number} len - Code length (default 6)
 * @param {number} maxAttempts - Max attempts before giving up (default 10)
 * @returns {Promise<string>} - A unique room code
 */
export async function genUniqueCode(len = 6, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = genCode(len);
    const used = await isCodeUsed(code);
    if (!used) {
      return code;
    }
    console.log(`[genUniqueCode] Code ${code} already exists, retrying...`);
  }
  // Fallback: return a code anyway (very unlikely to reach here)
  return genCode(len);
}

export function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
