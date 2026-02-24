'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import HowToPlayModal from '@/components/ui/HowToPlayModal';
import { storage } from '@/lib/utils/storage';

const STORAGE_PREFIX = 'htp_dismissed_';

/**
 * Mapping route → gameType.
 * Pour ajouter un nouveau jeu : ajouter une entrée ici.
 * Le provider s'active automatiquement sur les routes correspondantes.
 */
const ROUTE_GAME_MAP = [
  { pattern: /^\/room\/[^/]+$/, gameType: 'quiz' },
  { pattern: /^\/blindtest\/room\/[^/]+$/, gameType: 'deeztest' },
  { pattern: /^\/alibi\/room\/[^/]+$/, gameType: 'alibi' },
  { pattern: /^\/laregle\/room\/[^/]+$/, gameType: 'laregle' },
  { pattern: /^\/mime(\/room\/[^/]+)?$/, gameType: 'mime' },
  { pattern: /^\/daily\/semantique$/, gameType: 'semantique' },
  { pattern: /^\/daily\/motmystere$/, gameType: 'motmystere' },
];

const HowToPlayContext = createContext(null);

export function HowToPlayProvider({ children }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [gameType, setGameType] = useState(null);

  // Détecter le gameType depuis la route courante
  useEffect(() => {
    const match = ROUTE_GAME_MAP.find(({ pattern }) => pattern.test(pathname));
    setGameType(match?.gameType ?? null);
  }, [pathname]);

  // Auto-affichage quand le gameType change (entrée dans un jeu)
  useEffect(() => {
    if (!gameType) {
      setIsOpen(false);
      setIsAutoMode(false);
      return;
    }

    const dismissed = storage.get(`${STORAGE_PREFIX}${gameType}`);
    if (dismissed) return;

    const timer = setTimeout(() => {
      setIsAutoMode(true);
      setIsOpen(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [gameType]);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsAutoMode(false);
  }, []);

  const dismissForever = useCallback(() => {
    if (gameType) storage.set(`${STORAGE_PREFIX}${gameType}`, true);
    setIsOpen(false);
    setIsAutoMode(false);
  }, [gameType]);

  const openManually = useCallback(() => {
    setIsAutoMode(false);
    setIsOpen(true);
  }, []);

  return (
    <HowToPlayContext.Provider value={{ openManually }}>
      {children}
      {gameType && (
        <HowToPlayModal
          isOpen={isOpen}
          onClose={close}
          gameType={gameType}
          showDismiss={isAutoMode}
          onDismissForever={dismissForever}
        />
      )}
    </HowToPlayContext.Provider>
  );
}

/**
 * Hook pour ouvrir manuellement la modale Comment jouer.
 * Utilisable depuis n'importe quel composant (LobbyHeader, bouton ?, etc.)
 */
export function useHowToPlay() {
  return useContext(HowToPlayContext) ?? { openManually: null };
}
