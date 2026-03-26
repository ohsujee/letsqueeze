/**
 * LOL - Jeux Collectifs
 * Mini-jeux IRL qui forcent TOUS les joueurs à participer.
 * Le joueur du Joker lance le jeu, tout le monde joue.
 * Durée cible : ~3 minutes par jeu.
 */

export interface CollectiveGame {
  id: string;
  title: string;
  tone: 'classique' | 'absurde' | 'genant' | 'physique';
  difficulty: 'facile' | 'moyen' | 'hard';
  duration: string;
  rules: string;
  setup: string;
  variants?: string[];
  pro?: boolean;
}

import collective_001 from './collective_001';
import collective_002 from './collective_002';
import collective_003 from './collective_003';
import collective_004 from './collective_004';
import collective_005 from './collective_005';
import collective_006 from './collective_006';
import collective_007 from './collective_007';
import collective_008 from './collective_008';
import collective_009 from './collective_009';
import collective_010 from './collective_010';
import collective_011 from './collective_011';
import collective_012 from './collective_012';
import collective_013 from './collective_013';
import collective_014 from './collective_014';
import collective_015 from './collective_015';
import collective_016 from './collective_016';
import collective_017 from './collective_017';

export const COLLECTIVE_GAMES: CollectiveGame[] = [
  collective_001,
  collective_002,
  collective_003,
  collective_004,
  collective_005,
  collective_006,
  collective_007,
  collective_008,
  collective_009,
  collective_010,
  collective_011,
  collective_012,
  collective_013,
  collective_014,
  collective_015,
  collective_016,
  collective_017,
];

export function getRandomCollectiveGames(count: number, excludeIds: string[] = [], proOnly?: boolean): CollectiveGame[] {
  let pool = COLLECTIVE_GAMES.filter(g => !excludeIds.includes(g.id));
  if (proOnly === false) pool = pool.filter(g => !g.pro);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
