'use client';

/**
 * DevHowToPlayContext — Copie dev de HowToPlayContext
 * Détecte les routes /dev/* au lieu des routes de production
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import DevHowToPlayModal from '@/app/dev/components/DevHowToPlayModal';
import { HowToPlayContext } from '@/lib/context/HowToPlayContext';
import { storage } from '@/lib/utils/storage';

const STORAGE_PREFIX = 'dev_htp_dismissed_';

const DEV_ROUTE_GAME_MAP = [
  { pattern: /^\/dev\/(simulation\/)?laregle(\/.*)?$/, gameType: 'laregle'  },
  { pattern: /^\/dev\/(simulation\/)?quiz(\/.*)?$/,    gameType: 'quiz'     },
  { pattern: /^\/dev\/(simulation\/)?deeztest(\/.*)?$/,gameType: 'deeztest' },
  { pattern: /^\/dev\/(simulation\/)?alibi(\/.*)?$/,   gameType: 'alibi'    },
  { pattern: /^\/dev\/(simulation\/)?mime(\/.*)?$/,    gameType: 'mime'     },
  { pattern: /^\/dev\/(simulation\/)?blindtest(\/.*)?$/,gameType: 'deeztest' },
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

  // Auto-open seulement sur les routes dev directes, pas les simulations
  const isSimulation = pathname?.includes('/simulation/');

  useEffect(() => {
    if (!gameType || isSimulation) {
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
  }, [gameType, isSimulation]);

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
    </HowToPlayContext.Provider>
  );
}

export function useDevHowToPlay() {
  return useContext(DevHowToPlayContext) ?? { openManually: null };
}
