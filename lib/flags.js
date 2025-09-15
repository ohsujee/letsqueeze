// Centralise les feature flags (env + RTDB par room), OFF par défaut.
// Usage rapide :
//   import { useRoomFlags } from '@/lib/flags';
//   const flags = useRoomFlags(code); if (flags.presence_enabled) { ... }

'use client';
import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase';
import { onValue, ref } from 'firebase/database';

const DEFAULT_FLAGS = {
  presence_enabled: false,
  fairlock_enabled: false,
  hud_mvp: false,
  buzzer_v2: false,
  webaudio_enabled: false,
};

// Flags globaux en ENV (optionnel). Exemple : NEXT_PUBLIC_FLAG_PRESENCE=true
function envFlags() {
  const pick = (k, def = 'false') =>
    (typeof process !== 'undefined' &&
      process.env &&
      process.env[k] !== undefined
      ? process.env[k]
      : def);
  return {
    presence_enabled: String(pick('NEXT_PUBLIC_FLAG_PRESENCE', 'false')).toLowerCase() === 'true',
    fairlock_enabled: String(pick('NEXT_PUBLIC_FLAG_FAIRLOCK', 'false')).toLowerCase() === 'true',
    hud_mvp: String(pick('NEXT_PUBLIC_FLAG_HUD_MVP', 'false')).toLowerCase() === 'true',
    buzzer_v2: String(pick('NEXT_PUBLIC_FLAG_BUZZER_V2', 'false')).toLowerCase() === 'true',
    webaudio_enabled: String(pick('NEXT_PUBLIC_FLAG_WEBAUDIO', 'false')).toLowerCase() === 'true',
  };
}

// Merge simple: RTDB > ENV > DEFAULT
function mergeFlags(a, b, c) {
  return { ...a, ...b, ...c };
}

// Lis les flags d'une room dans RTDB: rooms/{code}/flags
function useRoomFlags(code) {
  const [roomFlags, setRoomFlags] = useState(null);

  useEffect(() => {
    if (!code) return;
    const unsub = onValue(ref(db, `rooms/${String(code).toUpperCase()}/flags`), (snap) => {
      const v = snap.val();
      setRoomFlags(v && typeof v === 'object' ? v : null);
    });
    return () => unsub();
  }, [code]);

  const flags = useMemo(() => {
    return mergeFlags(DEFAULT_FLAGS, envFlags(), roomFlags || {});
  }, [roomFlags]);

  return flags;
}

export { useRoomFlags, DEFAULT_FLAGS };
