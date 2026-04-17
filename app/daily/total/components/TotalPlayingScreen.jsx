'use client';

import { motion } from 'framer-motion';
import { Timer, ArrowCounterClockwise, Backspace, Star } from '@phosphor-icons/react';
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
      {/* Timer bar — flat */}
      <div className={`total-timer-bar ${timerCritical ? 'critical' : timerUrgent ? 'urgent' : ''}`}>
        <motion.div
          className="total-timer-fill"
          initial={{ width: '100%' }}
          animate={{ width: `${timerPct}%` }}
          transition={{ duration: 0.5, ease: 'linear' }}
        />
        <div className="total-timer-text">
          <Timer size={14} weight="fill" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Target + live result below */}
      <div className="total-target-area">
        <span className="total-target-label">CIBLE</span>
        <motion.span
          className="total-target-number"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
        >{puzzle.target}</motion.span>

        <div className="total-live-result">
          {liveResult !== null ? (
            <span className={`total-live-value ${liveResult === puzzle.target ? 'exact' : Math.abs(liveResult - puzzle.target) <= 10 ? 'close' : ''}`}>
              = {formatResult(liveResult)}
              {liveResult === puzzle.target ? ' 🎯' : ''}
            </span>
          ) : bestResult !== null && bestDifference > 0 ? (
            <span className="total-live-saved">
              Meilleur essai : {formatResult(bestResult)}, écart {bestResult >= puzzle.target ? '+' : '−'}{formatResult(bestDifference)}
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

      {/* Operator buttons — au-dessus comme une vraie calculatrice */}
      <div className="total-operators-row">
        {OPERATORS.map((op) => (
          <button
            key={op}
            className={`total-operator-btn ${expectingNumber ? 'disabled' : ''}`}
            onClick={() => onTapOperator(op)}
            disabled={expectingNumber}
          >
            {op}
          </button>
        ))}
      </div>

      {/* Number buttons */}
      <div className="total-numbers-grid">
        {puzzle.numbers.map((num, i) => (
          <button
            key={i}
            className={`total-number-btn ${usedIndices.has(i) ? 'used' : ''} ${!expectingNumber ? 'disabled' : ''}`}
            onClick={() => onTapNumber(num, i)}
            disabled={usedIndices.has(i) || !expectingNumber}
          >
            {num}
          </button>
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
          submissions.slice().reverse().map((sub, i, arr) => {
            const isBest = sub.difference === Math.min(...arr.map(s => s.difference));
            return (
              <div key={i} className="total-submission">
                <span className="total-sub-expr">{sub.expression}</span>
                <span className="total-sub-eq">= {formatResult(sub.result)}</span>
                <span className="total-sub-diff">
                  {sub.difference === 0 ? '🎯' : `${sub.result >= puzzle.target ? '+' : '−'}${formatResult(sub.difference)}`}
                </span>
                {isBest && <Star size={12} weight="fill" className="total-sub-star" />}
              </div>
            );
          })
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
