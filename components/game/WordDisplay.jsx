'use client';

import { motion } from 'framer-motion';

const ACCENT = '#ec4899';

/**
 * WordDisplay - Affichage du mot défendu avec lettres révélées + underscores
 *
 * @param {number} wordLength - Longueur totale du mot
 * @param {number} revealedLetters - Nombre de lettres révélées
 * @param {string} revealedPrefix - Les lettres révélées (ex: "PA")
 * @param {string} fullWord - Le mot complet (only for defenders)
 * @param {boolean} showAll - Afficher toutes les lettres (defenders / end screen)
 * @param {string} accentColor - Couleur d'accent
 */
export default function WordDisplay({
  wordLength = 0,
  revealedLetters = 1,
  revealedPrefix = '',
  fullWord = '',
  showAll = false,
  accentColor = ACCENT,
}) {
  if (!wordLength) return null;

  const letters = [];
  for (let i = 0; i < wordLength; i++) {
    const isRevealed = showAll || i < revealedLetters;
    let letter = '_';
    if (showAll && fullWord) {
      letter = fullWord[i] || '_';
    } else if (i < revealedPrefix.length) {
      letter = revealedPrefix[i];
    }
    letters.push({ letter, revealed: isRevealed, index: i });
  }

  // Scale tile size so it never wraps — fit within ~320px max width
  const gap = 4;
  const maxContainerWidth = 320;
  const maxTileSize = 34;
  const tileSize = Math.min(maxTileSize, Math.floor((maxContainerWidth - (wordLength - 1) * gap) / wordLength));
  const fontSize = tileSize >= 28 ? '0.95rem' : tileSize >= 22 ? '0.78rem' : '0.65rem';
  const tileRadius = tileSize >= 28 ? '8px' : '6px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{
        display: 'flex', justifyContent: 'center', gap: `${gap}px`,
        flexWrap: 'nowrap',
      }}>
        {letters.map((item) => (
          <motion.div
            key={item.index}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: item.index * 0.04 }}
            layout
            style={{
              width: `${tileSize}px`, height: `${Math.round(tileSize * 1.24)}px`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: tileRadius,
              background: item.revealed ? `${accentColor}22` : 'rgba(238,242,255,0.05)',
              border: item.revealed ? `1px solid ${accentColor}66` : '1px solid rgba(238,242,255,0.1)',
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize,
              color: item.revealed ? accentColor : 'rgba(238,242,255,0.2)',
              textShadow: item.revealed ? `0 0 8px ${accentColor}66` : 'none',
              flexShrink: 0,
            }}
          >
            {item.revealed ? item.letter : '_'}
          </motion.div>
        ))}
      </div>
      <div style={{
        fontSize: '0.68rem', color: 'rgba(238,242,255,0.3)',
      }}>
        {wordLength} lettres · {revealedLetters} révélée{revealedLetters > 1 ? 's' : ''}
      </div>
    </div>
  );
}
