'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

/**
 * Écoute Firebase users/{uid}/inbox/ et retourne la première notification
 * non lue de type 'anticheat'. La marque immédiatement comme lue.
 */
export function useInbox() {
  const [uid, setUid] = useState(() => auth.currentUser?.uid || null);
  const [pendingNotif, setPendingNotif] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;

    const inboxRef = ref(db, `users/${uid}/inbox`);
    const unsub = onValue(inboxRef, (snap) => {
      if (!snap.exists()) return;
      const inbox = snap.val();
      const unread = Object.entries(inbox).find(
        ([, notif]) => notif.type === 'anticheat' && !notif.read
      );
      if (!unread) return;

      const [notifId, notif] = unread;

      // Marquer comme lu immédiatement
      update(ref(db, `users/${uid}/inbox/${notifId}`), { read: true }).catch(() => {});

      setPendingNotif(notif);
    });

    return () => unsub();
  }, [uid]);

  const dismiss = () => setPendingNotif(null);

  return { pendingNotif, dismiss };
}
