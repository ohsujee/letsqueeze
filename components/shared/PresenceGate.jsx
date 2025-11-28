'use client';
// Petit composant à insérer dans les pages pour activer l'effet de présence.

import { usePresence } from '@/hooks/usePresence';

export default function PresenceGate({ roomCode, uid }) {
  usePresence(roomCode, uid);
  return null;
}
