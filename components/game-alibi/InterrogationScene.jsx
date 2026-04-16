'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Clock, PaperPlaneTilt, Users } from '@phosphor-icons/react';
import Avatar from '@/components/ui/Avatar';
import './InterrogationScene.css';

/**
 * InterrogationScene — Immersive UI for the interrogation phase.
 *
 * Layers (z-index bottom → top):
 *   0 — Mirror backdrop + spectator silhouettes behind the glass
 *   1 — Room background (WebP, 9:16) with a transparent mirror hole
 *   2 — Table foreground (WebP)
 *   9 — Dossier / notepad / timer HUD (HTML)
 *
 * The dossier is a simple framed box centered on the viewport
 * (see `scene-ui-wrap`). Additional decorative SVG elements
 * can be layered inside the scene-image-wrap to bring the room
 * to life (lamp, props, inspectors, etc.).
 */
export default function InterrogationScene({
  viewRole = 'inspector',
  questionState = 'waiting',
  inspectors = [],
  suspects = [],
  spectators = [],
  question = null,
  timeLeft = 30,
  isUrgent = false,
  isCritical = false,
  hasAnswered = false,
  allAnswered = false,
  myAnswer = '',
  responses = {},
  onMyAnswerChange,
  onStartQuestion,
  onSubmitAnswer,
  onJudge,
}) {
  // Dynamic sizing: dense layout when many spectators
  const mirrorAvatarSize = spectators.length > 6 ? 'xs' : 'sm';

  return (
    <div className={`interro-scene interro-scene-${viewRole}`}>
      {/* Full-screen backdrop — dark fill so no black bar on tall screens */}
      <div className="scene-image-wrap" aria-hidden>
        {/* Inner 9:16 ratio box — shared coordinate system for bg + mirror.
            Percentages inside this div match the image's internal coordinates. */}
        <div className="scene-image-ratio">
          {/* Layer 0 — Mirror backdrop with spectator silhouettes (pyramid) */}
          <div className="scene-mirror">
            {spectators.length > 0 && (
              <div className="scene-mirror-silhouettes">
                <PyramidGroup
                  players={spectators}
                  maxPerRow={4}
                  avatarSize={mirrorAvatarSize}
                  silhouetteClass="silhouette-mirror"
                />
              </div>
            )}
          </div>

          {/* Layer 1 — Room background (WebP with transparent mirror hole) */}
          <div
            className="scene-bg"
            style={{ backgroundImage: "url('/images/alibi/interrogation-room-bg.webp')" }}
          />

          {/* Layer 2 — Inspector silhouettes BEHIND the table (pyramid) */}
          {inspectors.length > 0 && (
            <div className="scene-table-inspectors">
              <PyramidGroup
                players={inspectors}
                maxPerRow={3}
                avatarSize="md"
                silhouetteClass="silhouette-table"
              />
            </div>
          )}

          {/* Layer 3 — Table foreground (covers inspector bodies) */}
          <div
            className="scene-table"
            style={{ backgroundImage: "url('/images/alibi/interrogation-table.webp')" }}
          />
        </div>
      </div>

      {/* Layer 5 — Timer HUD */}
      {questionState === 'answering' && (
        <div className={`scene-timer-hud ${isCritical ? 'critical' : isUrgent ? 'urgent' : ''}`}>
          {allAnswered ? (
            <>
              <CheckCircle size={18} weight="fill" />
              <span>Toutes les réponses envoyées</span>
            </>
          ) : (
            <>
              <Clock size={16} weight="bold" />
              <span>{timeLeft}s</span>
            </>
          )}
        </div>
      )}

      {/* Layer 4 — Dossier / question frame — full-scene overlay so it
          centers on the viewport, not the 9:16 image area */}
      <div className="scene-ui-wrap">
        {/* ─── Inspector view ─── */}
        {viewRole === 'inspector' && question && (
          <Dossier isOpen>
            {questionState === 'waiting' ? (
              <>
                {question.number !== undefined && (
                  <div className="dossier-page-number">QUESTION {question.number}</div>
                )}
                <p className="dossier-page-text">{question.text}</p>
                {question.hint && (
                  <div className="dossier-page-hint">
                    <span className="hint-label">📖 Contexte</span>
                    <p>{question.hint}</p>
                  </div>
                )}
                <button className="dossier-btn-start" onClick={onStartQuestion}>
                  <Clock size={16} weight="bold" />
                  <span>Lancer (30s)</span>
                </button>
              </>
            ) : (
              <>
                {question.number !== undefined && (
                  <div className="dossier-page-number">QUESTION {question.number}</div>
                )}
                <p className="dossier-page-text-small">{question.text}</p>
                <div className="dossier-responses-counter">
                  <Users size={12} weight="bold" />
                  <span>{Object.keys(responses).length}/{suspects.length}</span>
                </div>
                <div className="dossier-responses-list">
                  {suspects.map((s) => {
                    const r = responses[s.uid];
                    return (
                      <div key={s.uid} className={`dossier-response ${r ? 'answered' : 'waiting'}`}>
                        <div className="dossier-response-header">
                          <span className="dossier-response-name">{s.name}</span>
                          {r ? <CheckCircle size={12} /> : <Clock size={12} />}
                        </div>
                        {r ? (
                          <p className="dossier-response-text">{r.answer}</p>
                        ) : (
                          <p className="dossier-response-pending">—</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {allAnswered && (
                  <div className="dossier-judgment">
                    <button className="dossier-btn-judge reject" onClick={() => onJudge(false)}>
                      <XCircle size={14} weight="fill" />
                      <span>Refuser</span>
                    </button>
                    <button className="dossier-btn-judge accept" onClick={() => onJudge(true)}>
                      <CheckCircle size={14} weight="fill" />
                      <span>Valider</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </Dossier>
        )}

        {/* ─── Suspect: answering (notepad slide-up) ─── */}
        {viewRole === 'suspect' && questionState === 'answering' && !hasAnswered && (
          <div className="scene-notepad-center">
            <motion.div
              key="suspect-answering"
              className="scene-notepad"
              initial={{ opacity: 0, y: 200, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            >
              <div className="notepad-question">
                {question?.number !== undefined && (
                  <div className="notepad-question-number">QUESTION {question.number}</div>
                )}
                <p className="notepad-question-text">{question?.text}</p>
              </div>
              <textarea
                className="notepad-textarea"
                placeholder="Ta réponse..."
                value={myAnswer}
                onChange={(e) => onMyAnswerChange(e.target.value)}
                maxLength={500}
                autoComplete="off"
                autoFocus
              />
              <button
                className="notepad-btn-submit"
                onClick={onSubmitAnswer}
                disabled={!myAnswer.trim()}
              >
                <PaperPlaneTilt size={18} weight="fill" />
                <span>Envoyer ma réponse</span>
              </button>
            </motion.div>
          </div>
        )}

        {/* ─── Spectator view ─── */}
        {viewRole === 'spectator' && question && (
          <Dossier isOpen>
            {question.number !== undefined && (
              <div className="dossier-page-number">QUESTION {question.number}</div>
            )}
            <p className="dossier-page-text">{question.text}</p>
            {questionState === 'answering' && (
              <>
                <div className="dossier-responses-counter">
                  <Users size={12} weight="bold" />
                  <span>{Object.keys(responses).length}/{suspects.length}</span>
                </div>
                <div className="dossier-responses-list">
                  {suspects.map((s) => {
                    const r = responses[s.uid];
                    return (
                      <div key={s.uid} className={`dossier-response ${r ? 'answered' : 'waiting'}`}>
                        <div className="dossier-response-header">
                          <span className="dossier-response-name">{s.name}</span>
                          {r ? <CheckCircle size={12} /> : <Clock size={12} />}
                        </div>
                        {r && <p className="dossier-response-text">{r.answer}</p>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Dossier>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Dossier — Simple framed question box (HTML/CSS).
   Used to show the current question in the scene overlay.
   When isOpen is false, nothing is rendered (waiting state).
   ────────────────────────────────────────────────────────── */
function Dossier({ isOpen, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="scene-dossier-center">
          <motion.div
            key="dossier-frame"
            className="scene-dossier-frame"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────────────────────────────────────
   buildPyramidRows — Distributes players into staggered rows.
   Front row (bottom) is widest. Each row behind has 1 fewer
   person and is positioned between the gaps of the row in front.

   Example with 7 players, maxPerRow=4:
     Row 2 (back):  [P7]                    ← 1, smallest
     Row 1 (mid):   [P5]   [P6]             ← 2, between front row gaps
     Row 0 (front): [P1] [P2] [P3] [P4]     ← 4, widest

   Returns rows ordered back→front (first rendered = behind).
   ────────────────────────────────────────────────────────── */
function buildPyramidRows(players, maxPerRow) {
  if (players.length === 0) return [];

  const rowSizes = [];
  let remaining = players.length;
  let rowSize = Math.min(maxPerRow, remaining);
  while (remaining > 0) {
    const size = Math.min(rowSize, remaining);
    rowSizes.push(size);
    remaining -= size;
    rowSize = Math.max(1, rowSize - 1);
  }
  // rowSizes[0] = front (largest), rowSizes[last] = back (smallest)

  const rows = [];
  let idx = 0;
  for (let r = rowSizes.length - 1; r >= 0; r--) {
    const row = [];
    for (let i = 0; i < rowSizes[r]; i++) {
      if (idx < players.length) row.push(players[idx++]);
    }
    rows.push(row);
  }
  // rows[0] = back row, rows[last] = front row
  return rows;
}

/* ──────────────────────────────────────────────────────────
   Silhouette — Unified avatar + SVG body component.
   Used for both inspectors (at the table) and spectators
   (behind the mirror). The SVG body uses the player's team
   color, muted by the CSS context (filter/opacity).
   ────────────────────────────────────────────────────────── */
function Silhouette({ player, avatarSize = 'sm', className = '' }) {
  const initial = (player?.name || '?')[0].toUpperCase();
  const teamColor = player?.teamColor || player?.avatar?.color || '#5a4a30';
  return (
    <div className={`scene-silhouette ${className}`}>
      <div className="silhouette-head">
        <Avatar
          initial={initial}
          size={avatarSize}
          avatarId={player?.avatar?.id}
          avatarColor={player?.avatar?.color}
        />
      </div>
      <svg
        className="silhouette-body"
        viewBox="0 0 100 65"
        preserveAspectRatio="xMidYMin meet"
        aria-hidden
      >
        <path
          d="M 0 65 L 0 28 Q 0 6, 25 3 Q 38 0, 50 0 Q 62 0, 75 3 Q 100 6, 100 28 L 100 65 Z"
          fill={teamColor}
        />
        <path
          d="M 8 28 Q 8 12, 28 8 Q 40 5, 50 5 Q 60 5, 72 8 Q 92 12, 92 28 L 92 20 Q 92 10, 72 6 Q 60 3, 50 3 Q 40 3, 28 6 Q 8 10, 8 20 Z"
          fill="rgba(255,255,255,0.08)"
        />
      </svg>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   PyramidGroup — Renders players as an interleaved pyramid.
   Back-row people are nestled BETWEEN front-row people (not
   stacked above), creating a natural crowd look. Each row
   behind is slightly smaller (perspective) and overlaps into
   the row in front via negative margin.
   ────────────────────────────────────────────────────────── */
function PyramidGroup({ players, maxPerRow, avatarSize = 'sm', silhouetteClass = '' }) {
  const rows = useMemo(() => buildPyramidRows(players, maxPerRow), [players, maxPerRow]);
  if (rows.length === 0) return null;

  return (
    <div className="pyramid-group">
      {rows.map((row, rowIdx) => {
        // rowIdx 0 = back (smallest), rowIdx last = front (largest)
        const depth = rows.length - 1 - rowIdx; // 0 = front
        const scale = 1 - depth * 0.15;
        return (
          <div
            key={rowIdx}
            className="pyramid-row"
            style={{
              transform: `scale(${scale})`,
              zIndex: rowIdx + 1,
            }}
          >
            {row.map((p) => (
              <Silhouette key={p.uid} player={p} avatarSize={avatarSize} className={silhouetteClass} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
