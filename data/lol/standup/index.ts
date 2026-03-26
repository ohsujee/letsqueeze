/**
 * LOL - Fiches Stand-Up (Monologues)
 * Le joueur performe ce texte comme un spectacle de comédie.
 * Les indications de jeu sont entre [crochets].
 */

export interface StandupScript {
  id: string;
  title: string;
  tone: 'absurde' | 'genant' | 'cringe' | 'dark' | 'wholesome';
  difficulty: 'facile' | 'moyen' | 'hard';
  duration: string;
  script: string;
  stageDirections: string;
  pro?: boolean;
}

import standup_001 from './standup_001';
import standup_002 from './standup_002';
import standup_003 from './standup_003';
import standup_004 from './standup_004';
import standup_005 from './standup_005';
import standup_006 from './standup_006';
import standup_007 from './standup_007';
import standup_008 from './standup_008';
import standup_009 from './standup_009';
import standup_010 from './standup_010';
import standup_011 from './standup_011';
import standup_012 from './standup_012';
import standup_013 from './standup_013';
import standup_014 from './standup_014';
import standup_015 from './standup_015';
import standup_016 from './standup_016';
import standup_017 from './standup_017';
import standup_018 from './standup_018';
import standup_019 from './standup_019';
import standup_020 from './standup_020';
import standup_021 from './standup_021';
import standup_022 from './standup_022';

export const STANDUP_SCRIPTS: StandupScript[] = [
  standup_001,
  standup_002,
  standup_003,
  standup_004,
  standup_005,
  standup_006,
  standup_007,
  standup_008,
  standup_009,
  standup_010,
  standup_011,
  standup_012,
  standup_013,
  standup_014,
  standup_015,
  standup_016,
  standup_017,
  standup_018,
  standup_019,
  standup_020,
  standup_021,
  standup_022,
];

export function getRandomStandups(count: number, excludeIds: string[] = [], proOnly?: boolean): StandupScript[] {
  let pool = STANDUP_SCRIPTS.filter(s => !excludeIds.includes(s.id));
  if (proOnly === false) pool = pool.filter(s => !s.pro);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
