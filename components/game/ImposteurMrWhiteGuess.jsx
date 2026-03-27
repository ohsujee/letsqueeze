"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const MR_WHITE_COLOR = '#a78bfa';
const GUESS_TIMER = 15; // seconds

/**
 * Mr. White's last chance modal — text input + 15s timer to guess the civilian word.
 */
export default function ImposteurMrWhiteGuess({
  isMe,
  onSubmitGuess,
  mrWhiteGuess,
  mrWhiteGuessCorrect,
  playerName,
}) {
  const [guess, setGuess] = useState('');
  const [timeLeft, setTimeLeft] = useState(GUESS_TIMER);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    if (isMe && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 500);
    }
  }, [isMe]);

  // Timer
  useEffect(() => {
    if (!isMe || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto-submit empty guess on timeout
          if (!submitted) {
            setSubmitted(true);
            onSubmitGuess?.('');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isMe, submitted, onSubmitGuess]);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    clearInterval(timerRef.current);
    onSubmitGuess?.(guess.trim());
  }, [guess, submitted, onSubmitGuess]);

  // Show result if guess has been evaluated
  if (mrWhiteGuess !== null && mrWhiteGuess !== undefined) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'rgba(12,14,28,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1.5px solid ${mrWhiteGuessCorrect ? '#4ade8040' : '#ef444440'}`,
          borderRadius: '22px',
          padding: '32px 24px',
          textAlign: 'center',
          boxShadow: `0 0 50px ${mrWhiteGuessCorrect ? '#4ade8020' : '#ef444420'}`,
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
          {mrWhiteGuessCorrect ? '🎉' : '😵'}
        </div>
        <div style={{
          fontFamily: "var(--font-title, 'Bungee'), cursive",
          fontSize: '1.2rem',
          color: mrWhiteGuessCorrect ? '#4ade80' : '#f87171',
          textShadow: `0 0 20px ${mrWhiteGuessCorrect ? '#4ade8055' : '#f8717155'}`,
          marginBottom: '8px',
        }}>
          {mrWhiteGuessCorrect ? 'Bingo !' : 'Raté !'}
        </div>
        <div style={{
          fontSize: '0.85rem', fontWeight: 600,
          color: 'rgba(238,242,255,0.5)',
        }}>
          {mrWhiteGuessCorrect
            ? `Mr. White a deviné le mot ! Victoire des imposteurs !`
            : `Mr. White a proposé "${mrWhiteGuess}" — ce n'était pas le bon mot.`
          }
        </div>
      </motion.div>
    );
  }

  // Mr. White's input view
  if (isMe) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: 'rgba(12,14,28,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1.5px solid ${MR_WHITE_COLOR}30`,
          borderRadius: '22px',
          padding: '32px 24px',
          textAlign: 'center',
          boxShadow: `0 0 50px ${MR_WHITE_COLOR}15`,
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>👻</div>
        <div style={{
          fontFamily: "var(--font-title, 'Bungee'), cursive",
          fontSize: '1.1rem',
          color: MR_WHITE_COLOR,
          textShadow: `0 0 20px ${MR_WHITE_COLOR}55`,
          marginBottom: '6px',
        }}>
          Dernière chance !
        </div>
        <div style={{
          fontSize: '0.8rem', color: 'rgba(238,242,255,0.45)',
          fontWeight: 600, marginBottom: '20px',
        }}>
          Quel est le mot des civils ?
        </div>

        {/* Timer */}
        <div style={{
          fontFamily: "var(--font-title, 'Bungee'), cursive",
          fontSize: '2rem',
          color: timeLeft <= 5 ? '#ef4444' : MR_WHITE_COLOR,
          textShadow: `0 0 16px ${timeLeft <= 5 ? '#ef444466' : `${MR_WHITE_COLOR}66`}`,
          marginBottom: '16px',
          transition: 'color 0.3s ease',
        }}>
          {timeLeft}s
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value.slice(0, 40))}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Tape le mot..."
          disabled={submitted}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: '12px',
            border: `1.5px solid ${MR_WHITE_COLOR}40`,
            background: 'rgba(238,242,255,0.05)',
            color: '#eef2ff',
            fontSize: '1rem',
            fontWeight: 700,
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            textAlign: 'center',
            outline: 'none',
            marginBottom: '12px',
          }}
        />

        {/* Submit */}
        <motion.button
          onClick={handleSubmit}
          disabled={submitted || !guess.trim()}
          whileTap={{ scale: 0.97 }}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            border: 'none',
            background: submitted || !guess.trim()
              ? 'rgba(238,242,255,0.06)'
              : `linear-gradient(135deg, ${MR_WHITE_COLOR}, #8b5cf6)`,
            color: submitted || !guess.trim() ? 'rgba(238,242,255,0.3)' : '#fff',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: submitted || !guess.trim() ? 'default' : 'pointer',
            boxShadow: submitted || !guess.trim() ? 'none' : `0 4px 20px ${MR_WHITE_COLOR}44`,
          }}
        >
          {submitted ? 'Envoyé...' : 'Deviner !'}
        </motion.button>
      </motion.div>
    );
  }

  // Spectator view — waiting for Mr. White's guess
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        background: 'rgba(12,14,28,0.92)',
        border: `1px solid ${MR_WHITE_COLOR}20`,
        borderRadius: '18px',
        padding: '28px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '12px' }}>👻</div>
      <div style={{
        fontFamily: "var(--font-title, 'Bungee'), cursive",
        fontSize: '1rem',
        color: MR_WHITE_COLOR,
        marginBottom: '8px',
      }}>
        {playerName || 'Mr. White'} devine...
      </div>
      <div style={{
        fontSize: '0.8rem', color: 'rgba(238,242,255,0.4)',
        fontWeight: 600,
      }}>
        Mr. White tente de deviner le mot des civils
      </div>
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        style={{
          marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '4px',
        }}
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: MR_WHITE_COLOR }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
