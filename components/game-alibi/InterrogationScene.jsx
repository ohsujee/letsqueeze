'use client';

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
 * (see `scene-ui-wrap-full`). Additional decorative SVG elements
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
  // Show up to 6 spectator avatars behind the one-way mirror
  const mirrorSpectators = spectators.slice(0, 6);

  return (
    <div className={`interro-scene interro-scene-${viewRole}`}>
      {/* Image-space wrapper — shared coordinate system for bg + mirror */}
      <div className="scene-image-wrap" aria-hidden>
        {/* Layer 0 — Mirror backdrop with spectator silhouettes */}
        <div className="scene-mirror">
          {mirrorSpectators.length > 0 && (
            <div className="scene-mirror-silhouettes">
              {mirrorSpectators.map((p) => (
                <MirrorSilhouette key={p.uid} player={p} />
              ))}
            </div>
          )}
        </div>

        {/* Layer 1 — Room background (PNG with transparent mirror hole) */}
        <div
          className="scene-bg"
          style={{ backgroundImage: "url('/images/alibi/interrogation-room-bg.webp')" }}
        />

        {/* Layer 2 — Table foreground (first-person perspective) */}
        <div
          className="scene-table"
          style={{ backgroundImage: "url('/images/alibi/interrogation-table.webp')" }}
        />
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
      <div className="scene-ui-wrap scene-ui-wrap-full">
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
                    <span className="hint-label">📖</span>
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
   MirrorSilhouette — avatar with a dark SVG body underneath
   Creates a "person standing behind the glass" silhouette.
   The avatar sits on top as the head, the SVG is the torso.
   ────────────────────────────────────────────────────────── */
function MirrorSilhouette({ player }) {
  const initial = (player?.name || '?')[0].toUpperCase();
  return (
    <div className="scene-mirror-silhouette">
      {/* Head = existing Avatar component */}
      <div className="silhouette-head">
        <Avatar
          initial={initial}
          size="sm"
          avatarId={player?.avatar?.id}
          avatarColor={player?.avatar?.color}
        />
      </div>

      {/* Body = SVG bust (shoulders + upper torso) */}
      <svg
        className="silhouette-body"
        viewBox="0 0 100 60"
        preserveAspectRatio="xMidYMin meet"
        aria-hidden
      >
        {/* Shoulders curve — the top center dip (around 50, 2) is where
            the avatar head nestles. Wide flaring shoulders, then straight
            sides down to the bottom edge. */}
        <path
          d="
            M 0 60
            L 0 30
            Q 0 8, 25 4
            Q 38 2, 50 2
            Q 62 2, 75 4
            Q 100 8, 100 30
            L 100 60
            Z
          "
          fill="#1a1410"
        />
        {/* Subtle top-lit highlight on the shoulders (flat hard-edge) */}
        <path
          d="
            M 8 30
            Q 8 14, 28 10
            Q 38 8, 50 8
            Q 62 8, 72 10
            Q 92 14, 92 30
            L 92 22
            Q 92 12, 72 8
            Q 62 6, 50 6
            Q 38 6, 28 8
            Q 8 12, 8 22
            Z
          "
          fill="#2a2218"
        />
      </svg>
    </div>
  );
}
