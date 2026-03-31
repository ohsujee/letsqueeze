'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Link as LinkIcon, Clock, Check, X } from 'lucide-react';
import { HandPalm, Microphone } from '@phosphor-icons/react';
import './LinkOverlay.css';

/**
 * LinkOverlay - Unified UI for all link phases
 *
 * Renders inside the play/defend page when a link is active.
 * Handles: clue input, waiting timer, candidate selection, countdown,
 * word input (written mode), reveal, result display.
 */
export default function LinkOverlay({ link, mode, players = [], myUid, myRole = 'attacker', revealedPrefix = '', opaque = false }) {
  const [clueInput, setClueInput] = useState('');
  const [linkWordInput, setLinkWordInput] = useState('');
  const [interceptInput, setInterceptInput] = useState('');
  const [showInterceptInput, setShowInterceptInput] = useState(false);
  const [prefixError, setPrefixError] = useState('');

  const {
    activeLink, phase, isInitiator, isChosen, isInLink, candidates,
    failedInterceptors,
    countdown, waitingTimeLeft, clueTimeLeft, announcingTimeLeft, waitingProgress,
    WAITING_DURATION, CLUE_DURATION, ANNOUNCING_DURATION,
    submitClue, requestLink, chooseCandidate, submitLinkWord,
    startIntercept, intercept, confirmIntercept, validateOralResult,
  } = link;

  const prevCandidatesLenRef = useRef(0);

  // Vibrate ALL phones when announcing phase starts (someone clicked "J'ai un indice")
  useEffect(() => {
    if (phase === 'announcing') {
      navigator?.vibrate?.([100, 50, 100]);
    }
  }, [phase]);

  // Vibrate initiator's phone when a new candidate requests to link
  useEffect(() => {
    if (!isInitiator || !candidates) return;
    if (candidates.length > prevCandidatesLenRef.current) {
      navigator?.vibrate?.([80, 40, 80]);
    }
    prevCandidatesLenRef.current = candidates.length;
  }, [candidates?.length, isInitiator]);

  if (!activeLink) return null;

  const getPlayerName = (uid) => players.find(p => p.uid === uid)?.name || '???';
  const initiatorName = getPlayerName(activeLink.initiatorUid);
  const chosenName = activeLink.chosenUid ? getPlayerName(activeLink.chosenUid) : null;
  const isDefender = myRole === 'defender';

  const handleSubmitClue = () => {
    if (!clueInput.trim()) return;
    submitClue(clueInput.trim());
    setClueInput('');
  };

  const handleSubmitWord = () => {
    if (!linkWordInput.trim()) return;
    if (revealedPrefix) {
      const normalized = linkWordInput.trim().toUpperCase();
      const prefix = revealedPrefix.toUpperCase();
      if (!normalized.startsWith(prefix)) {
        setPrefixError(`Le mot doit commencer par "${prefix}"`);
        return;
      }
    }
    setPrefixError('');
    submitLinkWord(linkWordInput.trim());
    setLinkWordInput('');
  };

  const handleIntercept = () => {
    if (!interceptInput.trim()) return;
    intercept(interceptInput.trim());
    setInterceptInput('');
    setShowInterceptInput(false);
  };

  return (
    <motion.div
      className={`link-overlay${opaque ? ' opaque' : ''}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* Progress bar for waiting phase */}
      {phase === 'waiting' && (
        <motion.div
          className="link-progress-bar"
          initial={{ width: '100%' }}
          animate={{ width: `${waitingProgress * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      )}

      {/* Clue timer bar */}
      {phase === 'clue' && (
        <motion.div
          className="link-progress-bar clue"
          initial={{ width: '100%' }}
          animate={{ width: `${(clueTimeLeft / CLUE_DURATION) * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      )}

      {/* ── ANNOUNCING PHASE (oral mode, 3s) ── */}
      {phase === 'announcing' && (
        <div className="link-phase-center">
          <motion.div
            className="link-announcing"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <motion.div
              className="link-announcing-icon"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Microphone size={24} weight="bold" color="#fff" />
            </motion.div>
            <div className="link-announcing-label">
              <strong className="link-accent">{initiatorName}</strong> donne son indice
            </div>
            <div className="link-announcing-hint">Écoutez bien !</div>
            <motion.div
              className="link-announcing-countdown"
              key={Math.ceil(announcingTimeLeft / 1000)}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {Math.ceil(announcingTimeLeft / 1000)}
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* ── CLUE PHASE ── */}
      {phase === 'clue' && isInitiator && (
        <div>
          <div className="link-clue-header">
            <Lightbulb size={14} />
            Ton indice (1 mot)
            <span className={`link-clue-timer${clueTimeLeft < 2000 ? ' urgent' : ''}`}>
              {Math.ceil(clueTimeLeft / 1000)}s
            </span>
          </div>
          <div className="link-input-row">
            <input
              type="text"
              value={clueInput}
              onChange={(e) => setClueInput(e.target.value)}
              placeholder="Ton indice..."
              autoFocus
              maxLength={30}
              className="link-input"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitClue(); }}
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmitClue}
              disabled={!clueInput.trim()}
              className={`link-submit-btn${clueInput.trim() ? ' active' : ''}`}
            >
              Go
            </motion.button>
          </div>
        </div>
      )}

      {/* Clue phase - others wait */}
      {phase === 'clue' && !isInitiator && (
        <div className="link-phase-center">
          <div className="link-clue-wait">
            <strong className="link-accent">{initiatorName}</strong> prépare son indice…
          </div>
        </div>
      )}

      {/* ── WAITING PHASE ── */}
      {phase === 'waiting' && (
        <div>
          {/* Clue display */}
          {activeLink.clue && activeLink.clue !== '(oral)' ? (
            <>
              <div className="link-waiting-clue">« {activeLink.clue} »</div>
              <div className="link-waiting-meta">
                Indice de {initiatorName}
                <span className={`link-waiting-timer${waitingTimeLeft < 3000 ? ' urgent' : ''}`}>
                  {Math.ceil(waitingTimeLeft / 1000)}s
                </span>
              </div>
            </>
          ) : (
            <div className="link-waiting-oral">
              <div className="link-waiting-oral-text">{initiatorName} a donné un indice !</div>
              <span className={`link-waiting-timer${waitingTimeLeft < 3000 ? ' urgent' : ''}`}>
                {Math.ceil(waitingTimeLeft / 1000)}s
              </span>
            </div>
          )}

          {/* Link button (attacker, not initiator) */}
          {!isDefender && !isInitiator && !candidates.includes(myUid) && !activeLink.defenderIntercept && (
            <motion.button
              className="link-request-btn"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={requestLink}
            >
              <LinkIcon size={18} />
              Link !
            </motion.button>
          )}

          {/* Already requested */}
          {!isDefender && !isInitiator && candidates.includes(myUid) && (
            <div className="link-requested">En attente de sélection…</div>
          )}

          {/* Initiator sees candidates */}
          {isInitiator && candidates.length > 0 && (
            <div>
              <div className="link-candidates-label">Clique pour linker ({candidates.length})</div>
              <div className="link-candidates-list">
                {candidates.map(uid => (
                  <motion.button
                    key={uid}
                    className="link-candidate-btn"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => chooseCandidate(uid)}
                  >
                    <LinkIcon size={14} color="#ec4899" />
                    {getPlayerName(uid)}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* No candidates yet (initiator) */}
          {isInitiator && candidates.length === 0 && !activeLink.defenderIntercept && (
            <div className="link-no-candidates">En attente de joueurs…</div>
          )}
        </div>
      )}

      {/* ── CHOOSING PHASE (multiple candidates) ── */}
      {phase === 'choosing' && (
        <div>
          <div className="link-choosing-label">
            « {activeLink.clue} » — Choisis ton partenaire
          </div>
          {isInitiator ? (
            <div className="link-candidates-list">
              {candidates.map(uid => (
                <motion.button
                  key={uid}
                  className="link-candidate-btn large"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => chooseCandidate(uid)}
                >
                  <LinkIcon size={16} color="#ec4899" />
                  {getPlayerName(uid)}
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="link-choosing-wait">
              {initiatorName} choisit son partenaire…
            </div>
          )}
        </div>
      )}

      {/* ── DEFENDER INTERCEPT SECTION ── */}
      <DefenderInterceptSection
        phase={phase}
        isDefender={isDefender}
        activeLink={activeLink}
        failedInterceptors={failedInterceptors}
        myUid={myUid}
        mode={mode}
        getPlayerName={getPlayerName}
        initiatorName={initiatorName}
        intercept={intercept}
        startIntercept={startIntercept}
        confirmIntercept={confirmIntercept}
        interceptInput={interceptInput}
        setInterceptInput={setInterceptInput}
        handleIntercept={handleIntercept}
      />

      {/* ── COUNTDOWN PHASE ── */}
      {phase === 'countdown' && (
        <div style={{ textAlign: 'center' }}>
          <div className="link-countdown-pair">{initiatorName} ↔ {chosenName}</div>

          <motion.div
            className="link-countdown-number"
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
          >
            {countdown > 0 ? countdown : ''}
          </motion.div>

          {countdown === 0 && (
            <motion.div
              className="link-countdown-go"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {mode === 'ecrit' ? 'RÉVÉLATION !' : 'DITES VOTRE MOT !'}
            </motion.div>
          )}

          {/* Written mode: input for linked players */}
          {mode === 'ecrit' && isInLink && countdown > 0 && (
            <div className="link-word-input-container">
              <div className="link-input-row">
                <input
                  type="text"
                  value={linkWordInput}
                  onChange={(e) => { setLinkWordInput(e.target.value); setPrefixError(''); }}
                  placeholder={revealedPrefix ? `${revealedPrefix.toUpperCase()}...` : 'Ton mot...'}
                  autoFocus
                  className={`link-word-input${prefixError ? ' error' : ''}`}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitWord(); }}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmitWord}
                  disabled={!linkWordInput.trim()}
                  className={`link-word-submit${linkWordInput.trim() ? ' active' : ''}`}
                >
                  OK
                </motion.button>
              </div>
              {prefixError && <div className="link-prefix-error">{prefixError}</div>}
            </div>
          )}

          {/* Written mode: word submitted indicator */}
          {mode === 'ecrit' && isInLink && (
            (isInitiator && activeLink.initiatorWord) || (isChosen && activeLink.responderWord)
          ) && (
            <div className="link-word-sent">✓ Mot envoyé</div>
          )}
        </div>
      )}

      {/* ── REVEAL PHASE ── */}
      {phase === 'reveal' && (
        <div style={{ textAlign: 'center' }}>
          {mode === 'ecrit' ? (
            <>
              <div className="link-reveal-label">Révélation</div>
              <div className="link-reveal-words">
                <div>
                  <div className="link-reveal-player-name">{initiatorName}</div>
                  <motion.div
                    className="link-reveal-word"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {activeLink.initiatorWord || '…'}
                  </motion.div>
                </div>
                <div>
                  <div className="link-reveal-player-name">{chosenName}</div>
                  <motion.div
                    className="link-reveal-word"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {activeLink.responderWord || '…'}
                  </motion.div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="link-reveal-label">Révélation</div>
              <div className="link-oral-reveal-text">
                <strong className="link-accent">{initiatorName}</strong> ↔ <strong className="link-accent">{chosenName}</strong> ont dit leur mot
              </div>
              {isDefender ? (
                <div className="link-validate-btns">
                  <motion.button className="link-validate-match" whileTap={{ scale: 0.95 }} onClick={() => validateOralResult(true)}>
                    <Check size={16} /> Même mot !
                  </motion.button>
                  <motion.button className="link-validate-no-match" whileTap={{ scale: 0.95 }} onClick={() => validateOralResult(false)}>
                    <X size={16} /> Pas le même
                  </motion.button>
                </div>
              ) : (
                <div className="link-validate-wait">Le défenseur vérifie…</div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── RESULT PHASE ── */}
      {phase === 'result' && (
        <div style={{ textAlign: 'center' }}>
          {activeLink.result === 'match' ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <div className="link-result-title match">MATCH !</div>
              <div className="link-result-sub">
                {isDefender ? 'Utilise les boutons ci-dessous pour révéler ou non la lettre' : 'En attente de la décision du défenseur…'}
              </div>
            </motion.div>
          ) : activeLink.result === 'intercepted' ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <div className="link-result-title intercepted">INTERCEPTÉ !</div>
              <div className="link-result-sub">Le défenseur a deviné le mot</div>
            </motion.div>
          ) : (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <div className="link-result-title no-match">PAS DE MATCH</div>
              <div className="link-result-sub">Pas le même mot…</div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}


/* ── Defender Intercept Section (extracted for readability) ── */

function DefenderInterceptSection({
  phase, isDefender, activeLink, failedInterceptors, myUid, mode,
  getPlayerName, initiatorName, intercept, startIntercept, confirmIntercept,
  interceptInput, setInterceptInput, handleIntercept,
}) {
  const interceptionPhases = ['announcing', 'waiting', 'choosing', 'countdown'];
  const showInterceptBlock = interceptionPhases.includes(phase) && isDefender;
  const di = activeLink.defenderIntercept;

  return (
    <>
      {/* Already failed on this link */}
      {showInterceptBlock && !di && failedInterceptors?.includes(myUid) && (
        <div className="link-defender-failed">
          <div className="link-defender-failed-text">Tu t'es trompé sur ce link</div>
          <div className="link-defender-failed-sub">Tu ne peux plus intercepter cette manche</div>
        </div>
      )}

      {/* Intercept button */}
      {showInterceptBlock && !di && !failedInterceptors?.includes(myUid) && (
        <motion.button
          className="link-intercept-btn"
          whileTap={{ scale: 0.97 }}
          onClick={() => mode === 'oral' ? intercept(null) : startIntercept()}
        >
          <HandPalm size={16} />
          J'intercepte !
        </motion.button>
      )}

      {/* Defender typing intercept word (écrit mode) — visible to ALL */}
      {di && di.confirmed === 'typing' && (() => {
        const defenderName = getPlayerName(di.defenderUid);
        const isMe = di.defenderUid === myUid;
        return (
          <motion.div
            className="link-intercept-section"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="link-intercept-header">
              <HandPalm size={14} color="#ef4444" />
              <span className="link-intercept-header-text">Interception</span>
            </div>
            {isMe ? (
              <>
                <div className="link-intercept-prompt">Quel mot essaient-ils de communiquer ?</div>
                <div className="link-input-row">
                  <input
                    type="text"
                    value={interceptInput}
                    onChange={(e) => setInterceptInput(e.target.value)}
                    placeholder="Le mot est..."
                    autoFocus
                    className="link-intercept-input"
                    onKeyDown={(e) => { if (e.key === 'Enter' && interceptInput.trim()) handleIntercept(); }}
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleIntercept}
                    disabled={!interceptInput.trim()}
                    className={`link-intercept-submit${interceptInput.trim() ? ' active' : ''}`}
                  >
                    OK
                  </motion.button>
                </div>
              </>
            ) : (
              <div className="link-intercept-spectator">
                <div className="link-intercept-spectator-text">
                  <strong className="link-danger">{defenderName}</strong> intercepte le link !
                </div>
                <div className="link-intercept-spectator-sub">En train d'écrire sa réponse…</div>
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* Defender interception pending — visible to ALL players */}
      {di && di.confirmed === 'pending' && (() => {
        const defenderName = getPlayerName(di.defenderUid);
        const guessedWord = di.guessedWord;
        const isOralIntercept = guessedWord === '(oral)';
        const isMe = di.defenderUid === myUid;
        return (
          <motion.div
            className="link-intercept-section"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="link-intercept-header">
              <HandPalm size={14} color="#ef4444" />
              <span className="link-intercept-header-text">Interception</span>
            </div>

            {link.isInitiator ? (
              <>
                <div className="link-confirm-prompt">
                  {isOralIntercept ? (
                    <>Est-ce que <strong className="link-danger">{defenderName}</strong> a trouvé ton mot ?</>
                  ) : (
                    <>
                      <strong className="link-danger">{defenderName}</strong> pense que tu essaies de faire deviner{' '}
                      <strong className="link-confirm-word">« {guessedWord} »</strong>
                      <br />
                      <span className="link-confirm-subtext">C'est bien ton mot ?</span>
                    </>
                  )}
                </div>
                <div className="link-confirm-btns">
                  <motion.button className="link-confirm-yes" whileTap={{ scale: 0.95 }} onClick={() => confirmIntercept(true)}>
                    <Check size={14} /> Oui, c'est ça
                  </motion.button>
                  <motion.button className="link-confirm-no" whileTap={{ scale: 0.95 }} onClick={() => confirmIntercept(false)}>
                    <X size={14} /> Non, raté
                  </motion.button>
                </div>
              </>
            ) : isMe ? (
              <div style={{ textAlign: 'center' }}>
                {isOralIntercept ? (
                  <div className="link-intercept-spectator-text">Dis à haute voix le mot que tu penses avoir trouvé !</div>
                ) : (
                  <div className="link-intercept-spectator-text">
                    Tu as proposé <strong className="link-confirm-word">« {guessedWord} »</strong>
                  </div>
                )}
                <div className="link-intercept-spectator-sub">En attente de la réponse de {initiatorName}…</div>
              </div>
            ) : (
              <div className="link-intercept-spectator">
                <div className="link-intercept-spectator-text">
                  <strong className="link-danger">{defenderName}</strong> intercepte le link !
                </div>
                <div className="link-intercept-spectator-sub">En attente de la réponse de {initiatorName}…</div>
              </div>
            )}
          </motion.div>
        );
      })()}
    </>
  );
}
