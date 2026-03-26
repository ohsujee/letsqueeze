/**
 * LOL - Scènes de Théâtre Classique Français
 * Le joueur du Joker choisit une scène et ses partenaires.
 * Tout le monde voit le script complet. Les blancs (______) sont à improviser.
 * Les vraies répliques de Molière / Rostand côtoient les blancs pour un contraste comique.
 */

export interface SceneRole {
  name: string;
  description: string;
}

export interface Scene {
  id: string;
  title: string;
  source: string;
  tone: 'absurde' | 'genant' | 'cringe' | 'dark' | 'wholesome';
  difficulty: 'facile' | 'moyen' | 'hard';
  duration: string;
  playerCount: number;
  setup: string;
  roles: SceneRole[];
  script: string;
  pro?: boolean;
}

import scene_001 from './scene_001';
import scene_002 from './scene_002';
import scene_003 from './scene_003';
import scene_004 from './scene_004';
import scene_005 from './scene_005';
import scene_006 from './scene_006';
import scene_007 from './scene_007';
import scene_008 from './scene_008';
import scene_009 from './scene_009';
import scene_010 from './scene_010';
import scene_011 from './scene_011';
import scene_012 from './scene_012';
import scene_013 from './scene_013';
import scene_014 from './scene_014';
import scene_015 from './scene_015';
import scene_016 from './scene_016';

export const SCENES: Scene[] = [
  // =============================================
  // DUOS (10 scènes)
  // =============================================
  scene_001,
  scene_002,
  scene_003,
  scene_004,
  scene_005,
  scene_006,
  scene_010,
  scene_011,
  scene_014,

  // =============================================
  // TRIOS (5 scènes)
  // =============================================
  scene_007,
  scene_008,
  scene_012,
  scene_015,
  scene_016,

  // =============================================
  // QUATUOR (2 scènes)
  // =============================================
  scene_009,
  scene_013,
];

export function getRandomScenes(count: number, maxPlayers: number, excludeIds: string[] = [], proOnly?: boolean): Scene[] {
  let pool = SCENES.filter(s => !excludeIds.includes(s.id) && s.playerCount <= maxPlayers);
  if (proOnly === false) pool = pool.filter(s => !s.pro);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
