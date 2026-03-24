'use client';

import { motion } from 'framer-motion';
import { Timer, ArrowCounterClockwise, Backspace } from '@phosphor-icons/react';
import { TIMER_SECONDS, OPERATORS, MAX_SUBMISSIONS, formatResult, formatTime } from './helpers';

export default function TotalPlayingScreen({
  puzzle,
  timeLeft,
  tokens,
  usedIndices,
  liveResult,
  bestResult,
  bestDifference,
  submissions,
  flashResult,
  canValidate,
  allUsed,
  onTapNumber,
  onTapOperator,
  onBackspace,
  onClear,
  onValidate,
  onFinishEarly,
}) {
  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerUrgent = timeLeft <= 30;
  const timerCritical = timeLeft <= 10;
  const expectingNumber = tokens.length === 0 || typeof tokens[tokens.length - 1] === 'string';
  const submissionsLeft = MAX_SUBMISSIONS - submissions.length;

  return (
    <div className="total-game" style={{ paddingTop: 8 }}>
      {/* Timer bar */}
      <div style={{
        position: 'relative', width: '100%', height: 32,
        borderRadius: 10,
        background: 'rgba(8,14,32,0.92)',
        border: `1px solid ${timerCritical ? 'rgba(239,68,68,0.25)' : timerUrgent ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.12)'}`,
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <motion.div
          style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            borderRadius: 10,
            background: timerCritical
              ? 'linear-gradient(90deg, #ef4444, #dc2626)'
              : timerUrgent
                ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                : 'linear-gradient(90deg, #3b82f6, #2563eb)',
            opacity: 0.85,
            boxShadow: timerCritical
              ? '0 0 16px rgba(239,68,68,0.5)'
              : timerUrgent
                ? '0 0 14px rgba(245,158,11,0.4)'
                : '0 0 10px rgba(59,130,246,0.35)',
          }}
          initial={{ width: '100%' }}
          animate={{ width: `${timerPct}%` }}
          transition={{ duration: 0.5, ease: 'linear' }}
        />
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', gap: '6px',
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          fontSize: '0.82rem', fontWeight: 700,
          color: timerCritical ? '#ef4444' : timerUrgent ? '#f59e0b' : 'rgba(238,242,255,0.8)',
          textShadow: timerCritical
            ? '0 0 10px rgba(239,68,68,0.6)'
            : timerUrgent
              ? '0 0 10px rgba(245,158,11,0.5)'
              : 'none',
        }}>
          <Timer size={14} weight="fill" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Target + live result below */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '4px 0', flexShrink: 0,
      }}>
        <span style={{
          fontSize: '0.6rem', fontWeight: 700, color: 'rgba(238,242,255,0.35)',
          textTransform: 'uppercase', letterSpacing: '0.15em',
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          marginBottom: 4,
        }}>CIBLE</span>
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
          style={{
            fontFamily: "var(--font-title, 'Bungee'), cursive",
            fontSize: '2.4rem', color: '#fff', lineHeight: 1,
            textShadow: '0 0 24px rgba(59,130,246,0.6), 0 0 6px rgba(59,130,246,0.3)',
          }}
        >{puzzle.target}</motion.span>

        {/* Live result — always takes space */}
        <div style={{
          marginTop: 6, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}>
          {liveResult !== null ? (
            <span style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: '1.5rem', lineHeight: 1,
              color: liveResult === puzzle.target ? '#10b981'
                : Math.abs(liveResult - puzzle.target) <= 10 ? '#f59e0b'
                : 'rgba(238,242,255,0.4)',
              textShadow: liveResult === puzzle.target ? '0 0 16px rgba(16,185,129,0.5)' : 'none',
              transition: 'color 0.15s ease',
            }}>
              = {formatResult(liveResult)}
              {liveResult === puzzle.target ? ' 🎯' : ''}
            </span>
          ) : bestResult !== null && bestDifference > 0 ? (
            <span style={{
              fontSize: '0.7rem', fontWeight: 600,
              color: 'rgba(59,130,246,0.5)',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            }}>
              ✓ Sauvegardé : {formatResult(bestResult)} (écart : {formatResult(bestDifference)})
            </span>
          ) : null}
        </div>
      </div>

      {/* Expression zone — fixed height for 2 rows */}
      <div className={`total-expression-zone ${flashResult || ''}`}>
        <div className="total-expression-tokens">
          {tokens.length === 0 ? (
            <span className="total-expression-placeholder">Choisis un chiffre…</span>
          ) : (
            <>
              {tokens.map((token, i) => (
                <span
                  key={i}
                  className={`total-token ${typeof token === 'number' ? 'number' : 'operator'}`}
                >
                  {token}
                </span>
              ))}
              {expectingNumber && (
                <span className="total-token-cursor">_</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Number buttons */}
      <div className="total-numbers-grid">
        {puzzle.numbers.map((num, i) => (
          <motion.button
            key={i}
            className={`total-number-btn ${usedIndices.has(i) ? 'used' : ''} ${!expectingNumber ? 'disabled' : ''}`}
            onClick={() => onTapNumber(num, i)}
            disabled={usedIndices.has(i) || !expectingNumber}
            whileTap={!usedIndices.has(i) && expectingNumber ? { scale: 0.9 } : {}}
          >
            {num}
          </motion.button>
        ))}
      </div>

      {/* Operator buttons */}
      <div className="total-operators-row">
        {OPERATORS.map((op) => (
          <motion.button
            key={op}
            className={`total-operator-btn ${expectingNumber ? 'disabled' : ''}`}
            onClick={() => onTapOperator(op)}
            disabled={expectingNumber}
            whileTap={!expectingNumber ? { scale: 0.9 } : {}}
          >
            {op}
          </motion.button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="total-actions-row">
        <button className="total-action-btn clear" onClick={onClear} disabled={tokens.length === 0}>
          <ArrowCounterClockwise size={18} weight="bold" />
        </button>
        <button className="total-action-btn backspace" onClick={onBackspace} disabled={tokens.length === 0}>
          <Backspace size={20} weight="bold" />
        </button>
        <motion.button
          className={`total-validate-btn ${canValidate ? 'active' : ''}`}
          onClick={onValidate}
          disabled={!canValidate}
          whileTap={canValidate ? { scale: 0.95 } : {}}
        >
          {submissionsLeft <= 0 ? 'Plus d\'essais' : allUsed ? `Valider (${submissionsLeft})` : `${usedIndices.size}/6 chiffres`}
        </motion.button>
      </div>

      {/* Submissions history — fills remaining space */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 2px',
      }}>
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, color: 'rgba(238,242,255,0.3)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
        }}>Essais</span>
        <span style={{
          fontSize: '0.72rem', fontWeight: 700,
          color: submissionsLeft <= 0 ? '#ef4444' : 'rgba(59,130,246,0.6)',
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
        }}>{submissions.length}/{MAX_SUBMISSIONS}</span>
      </div>
      <div className="total-submissions">
        {submissions.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(238,242,255,0.12)', fontSize: '0.75rem',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>
            Tes essais apparaîtront ici
          </div>
        ) : (
          submissions.slice().reverse().map((sub, i) => (
            <div key={i} className={`total-submission ${sub.difference === 0 ? 'exact' : sub.difference <= 10 ? 'close' : ''}`}>
              <span className="total-sub-expr">{sub.expression}</span>
              <span className="total-sub-eq">= {formatResult(sub.result)}</span>
              <span className="total-sub-diff">
                {sub.difference === 0 ? '🎯' : `±${formatResult(sub.difference)}`}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Finish early button */}
      {onFinishEarly && submissions.length > 0 && submissions.length < MAX_SUBMISSIONS && (
        <button
          onClick={onFinishEarly}
          style={{
            background: 'none', border: 'none',
            color: 'rgba(238,242,255,0.3)', fontSize: '0.72rem', fontWeight: 600,
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            cursor: 'pointer', padding: '8px 0',
            textDecoration: 'underline', textUnderlineOffset: '3px',
          }}
        >
          Terminer la partie
        </button>
      )}
    </div>
  );
}
