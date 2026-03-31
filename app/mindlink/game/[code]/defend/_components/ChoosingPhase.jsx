'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldStar, ArrowRight, Shuffle } from '@phosphor-icons/react';
import { db, ref, update } from '@/lib/firebase';
import { useToast } from '@/lib/hooks/useToast';

const ACCENT = '#ec4899';

/**
 * ChoosingPhase — Word chooser input + waiting view for other defenders.
 * Self-contained: manages its own wordInput, validation, random fetch state.
 */
export default function ChoosingPhase({ code, roomPrefix, meta, isWordChooser, wordChooserName }) {
  const toast = useToast();

  const [wordInput, setWordInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wordError, setWordError] = useState('');
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);
  const lastRandomRef = useRef('');

  const fetchRandomWord = useCallback(async () => {
    setIsLoadingRandom(true);
    setWordError('');
    try {
      const exclude = lastRandomRef.current;
      const url = exclude
        ? `/api/dictionary/random?exclude=${encodeURIComponent(exclude)}`
        : '/api/dictionary/random';
      const res = await fetch(url);
      const data = await res.json();
      if (data.word) {
        const w = data.word.toUpperCase();
        setWordInput(w);
        lastRandomRef.current = data.word;
      }
    } catch (err) {
      console.error('Random word error:', err);
      toast.error('Impossible de charger un mot');
    } finally {
      setIsLoadingRandom(false);
    }
  }, [toast]);

  const handleSubmitWord = useCallback(async () => {
    if (!wordInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setWordError('');

    const word = wordInput.trim().toUpperCase();
    const timerMs = (meta?.timerMinutes || 5) * 60 * 1000;

    try {
      await update(ref(db, `${roomPrefix}/${code}/state`), {
        secretWord: word,
        wordLength: word.length,
        revealedLetters: 1,
        revealedPrefix: word[0],
        phase: 'playing',
        timerEndAt: Date.now() + timerMs,
      });
    } catch (err) {
      console.error('Error submitting word:', err);
      toast.error('Erreur lors de la validation du mot');
      setIsSubmitting(false);
    }
  }, [wordInput, isSubmitting, meta?.timerMinutes, code, roomPrefix, toast]);

  return (
    <div className="defend-page">
      <div aria-hidden className="defend-bg">
        <div className="defend-bg-dots" />
        <div className="defend-bg-glow" />
      </div>

      <main className="defend-choosing-main">
        {isWordChooser ? (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
              <div className="defend-role-badge" style={{ marginBottom: '16px' }}>
                <ShieldStar size={16} weight="fill" color={ACCENT} />
                <span className="defend-role-badge-text">Défenseur</span>
              </div>
              <h2 className="defend-choosing-title">Choisis ton mot</h2>
              <p className="defend-choosing-subtitle">Les joueurs devront le deviner lettre par lettre</p>
            </motion.div>

            {/* Word input */}
            <motion.div
              className="defend-word-input-wrapper"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="defend-word-input-box">
                <input
                  type="text"
                  className="defend-word-input input-dark"
                  value={wordInput}
                  onChange={(e) => { setWordInput(e.target.value.replace(/[^a-zA-ZÀ-ÿ]/g, '')); setWordError(''); }}
                  placeholder="Tape ton mot..."
                  autoFocus
                  maxLength={20}
                  onKeyDown={(e) => { if (e.key === 'Enter' && wordInput.trim()) handleSubmitWord(); }}
                />
              </div>

              <motion.button
                className="defend-random-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                onClick={fetchRandomWord}
                disabled={isLoadingRandom}
                whileTap={{ scale: 0.95 }}
              >
                <Shuffle size={14} weight="bold" style={{
                  animation: isLoadingRandom ? 'defend-spin 0.8s linear infinite' : 'none',
                }} />
                {isLoadingRandom ? 'Chargement…' : 'Mot aléatoire'}
              </motion.button>

              <AnimatePresence>
                {wordError && (
                  <motion.p className="defend-word-error" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {wordError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Letter preview */}
              <AnimatePresence>
                {wordInput.trim() && (
                  <motion.div
                    className="defend-preview-tiles"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {(() => {
                      const letters = wordInput.trim().toUpperCase().split('');
                      const len = letters.length;
                      const gap = 6;
                      const maxWidth = 320;
                      const maxTile = 36;
                      const tileW = Math.min(maxTile, Math.floor((maxWidth - (len - 1) * gap) / len));
                      const tileH = Math.round(tileW * 1.22);
                      const fs = tileW >= 30 ? '1rem' : tileW >= 22 ? '0.8rem' : '0.65rem';
                      return letters.map((letter, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                          style={{
                            width: tileW, height: tileH,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '8px',
                            background: i === 0 ? 'rgba(236,72,153,0.15)' : 'rgba(238,242,255,0.05)',
                            border: i === 0 ? '1px solid rgba(236,72,153,0.4)' : '1px solid rgba(238,242,255,0.1)',
                            fontFamily: "var(--font-title, 'Bungee'), cursive",
                            fontSize: fs,
                            color: i === 0 ? ACCENT : 'rgba(238,242,255,0.25)',
                            textShadow: i === 0 ? `0 0 10px ${ACCENT}66` : 'none',
                          }}
                        >
                          {i === 0 ? letter : '_'}
                        </motion.div>
                      ));
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="defend-preview-hint">
                Les joueurs verront : la 1ère lettre + {wordInput.trim() ? wordInput.trim().length - 1 : '?'} underscores
              </p>
            </motion.div>

            {/* Submit */}
            <motion.button
              className={`defend-submit-btn ${wordInput.trim() ? 'active' : 'disabled'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={handleSubmitWord}
              disabled={!wordInput.trim() || isSubmitting}
              whileHover={wordInput.trim() ? { scale: 1.03, y: -2 } : {}}
              whileTap={wordInput.trim() ? { scale: 0.97 } : {}}
            >
              {isSubmitting ? <div className="defend-submit-spinner" /> : <ArrowRight size={18} weight="bold" />}
              {isSubmitting ? 'Lancement...' : 'Valider'}
            </motion.button>
          </>
        ) : (
          /* Other defenders waiting */
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
            <div className="defend-role-badge" style={{ marginBottom: '20px' }}>
              <ShieldStar size={16} weight="fill" color={ACCENT} />
              <span className="defend-role-badge-text">Défenseur</span>
            </div>
            <h2 className="defend-waiting-title">En attente du mot</h2>
            <p className="defend-waiting-text">
              <strong style={{ color: ACCENT }}>{wordChooserName}</strong> choisit le mot secret…
            </p>
            <motion.div
              className="defend-waiting-pulse"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
