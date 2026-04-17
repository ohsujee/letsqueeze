'use client';

/**
 * CodeBreakerBoard — plateau Mastermind avec animations.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CODE_LENGTH, MAX_ATTEMPTS, COLORS } from '../_hooks/useCodeBreakerGame';

function HintPegs({ hints, animate }) {
  const pegs = [];
  if (hints) {
    for (let i = 0; i < hints.black; i++) pegs.push('black');
    for (let i = 0; i < hints.white; i++) pegs.push('white');
  }
  while (pegs.length < CODE_LENGTH) pegs.push('empty');

  return (
    <div className="cb-hints">
      {pegs.map((type, i) => (
        <motion.div
          key={i}
          className={`cb-hint-peg ${type}`}
          initial={animate ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={animate ? { delay: 0.3 + i * 0.12, duration: 0.25, type: 'spring', stiffness: 300 } : {}}
        />
      ))}
    </div>
  );
}

function PegHole({ colorIndex, isActive, isSelected, onClick, animate, delay = 0 }) {
  const filled = colorIndex !== null && colorIndex !== undefined;
  return (
    <motion.div
      className={`cb-peg ${filled ? 'filled' : ''} ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
      style={filled ? { background: COLORS[colorIndex] } : undefined}
      onClick={onClick}
      initial={animate ? { scale: 0.6, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={animate ? { delay, duration: 0.2, type: 'spring', stiffness: 250 } : {}}
    />
  );
}

export default function CodeBreakerBoard({
  guesses,
  currentGuess,
  selectedSlot,
  gameOver,
  secret,
  onTapSlot,
  lastSubmitIndex,
  freshGameOver = false,
}) {
  const currentRow = guesses.length;
  const showSecret = gameOver;

  // Animation séquentielle du reveal secret (seulement sur completion fraîche)
  const [revealedCount, setRevealedCount] = useState(0);
  useEffect(() => {
    if (!showSecret) { setRevealedCount(0); return; }
    if (!freshGameOver) { setRevealedCount(CODE_LENGTH); return; } // restore → pas d'animation
    let cancelled = false;
    let timer;
    const reveal = (i) => {
      if (i > CODE_LENGTH || cancelled) return;
      timer = setTimeout(() => {
        if (cancelled) return;
        setRevealedCount(i);
        try { navigator.vibrate?.(30); } catch {}
        reveal(i + 1);
      }, 200);
    };
    reveal(1);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [showSecret, freshGameOver]);

  return (
    <div className="cb-board">
      {/* Code secret — encadré avec label + pions reveal séquentiel */}
      <div className={`cb-secret-banner ${showSecret ? 'revealed' : ''}`}>
        <span className="cb-secret-label">{showSecret ? 'Le code était' : 'Code à cracker'}</span>
        <div className="cb-row cb-secret-inner">
          <span className="cb-row-num" />
          <div className="cb-pegs">
            {Array(CODE_LENGTH).fill(null).map((_, i) => {
              const isRevealed = showSecret && i < revealedCount;
              return (
                <motion.div
                  key={i}
                  className={`cb-peg cb-secret-peg ${isRevealed ? 'filled' : ''}`}
                  style={isRevealed ? { background: COLORS[secret[i]] } : undefined}
                  animate={isRevealed ? { rotateY: [90, 0], scale: [0.8, 1.1, 1] } : {}}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  {!isRevealed && '?'}
                </motion.div>
              );
            })}
          </div>
          <div className="cb-hints" />
        </div>
      </div>

      {/* Lignes de jeu */}
      <div className="cb-rows">
        {Array(MAX_ATTEMPTS).fill(null).map((_, rowIdx) => {
          const displayRow = MAX_ATTEMPTS - 1 - rowIdx;
          const isPlayed = displayRow < currentRow;
          const isCurrent = displayRow === currentRow && !gameOver;
          const guess = isPlayed ? guesses[displayRow] : null;
          const isLastSubmit = displayRow === lastSubmitIndex;

          return (
            <div key={displayRow} className={`cb-row ${isCurrent ? 'current' : ''} ${isPlayed ? 'played' : ''}`}>
              <span className="cb-row-num">{displayRow + 1}</span>
              <div className="cb-pegs">
                {Array(CODE_LENGTH).fill(null).map((_, colIdx) => {
                  if (isPlayed) {
                    return (
                      <PegHole
                        key={colIdx}
                        colorIndex={guess.colors[colIdx]}
                        animate={isLastSubmit}
                        delay={colIdx * 0.06}
                      />
                    );
                  }
                  if (isCurrent) {
                    return (
                      <PegHole
                        key={colIdx}
                        colorIndex={currentGuess[colIdx]}
                        isActive
                        isSelected={selectedSlot === colIdx}
                        onClick={() => onTapSlot(colIdx)}
                      />
                    );
                  }
                  return <PegHole key={colIdx} colorIndex={null} />;
                })}
              </div>
              <HintPegs hints={isPlayed ? guess.hints : null} animate={isLastSubmit} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
