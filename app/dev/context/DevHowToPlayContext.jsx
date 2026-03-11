'use client';

/**
 * DevHowToPlayContext — Copie dev de HowToPlayContext
 * Détecte les routes /dev/* au lieu des routes de production
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import DevHowToPlayModal from '@/app/dev/components/DevHowToPlayModal';
import { storage } from '@/lib/utils/storage';

const STORAGE_PREFIX = 'dev_htp_dismissed_';

const DEV_ROUTE_GAME_MAP = [
  { pattern: /^\/dev\/laregle(\/.*)?$/, gameType: 'laregle'  },
  { pattern: /^\/dev\/quiz(\/.*)?$/,    gameType: 'quiz'     },
  { pattern: /^\/dev\/deeztest(\/.*)?$/,gameType: 'deeztest' },
  { pattern: /^\/dev\/alibi(\/.*)?$/,   gameType: 'alibi'    },
  { pattern: /^\/dev\/mime(\/.*)?$/,    gameType: 'mime'     },
];

const DevHowToPlayContext = createContext(null);

export function DevHowToPlayProvider({ children }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen]       = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [gameType, setGameType]   = useState(null);

  useEffect(() => {
    const match = DEV_ROUTE_GAME_MAP.find(({ pattern }) => pattern.test(pathname));
    setGameType(match?.gameType ?? null);
  }, [pathname]);

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
    <DevHowToPlayContext.Provider value={{ openManually }}>
      {children}
      {gameType && (
        <DevHowToPlayModal
          isOpen={isOpen}
          onClose={close}
          gameType={gameType}
          showDismiss={isAutoMode}
          onDismissForever={dismissForever}
        />
      )}
    </DevHowToPlayContext.Provider>
  );
}

export function useDevHowToPlay() {
  return useContext(DevHowToPlayContext) ?? { openManually: null };
}
