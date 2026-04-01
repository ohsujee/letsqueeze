"use client";

import { motion } from 'framer-motion';
import { Microphone, PencilSimple, ArrowRight, EyeSlash } from '@phosphor-icons/react';
import ImposteurClueWall from '@/components/game/ImposteurClueWall';
import ImposteurRoleCard from '@/components/game/ImposteurRoleCard';
import './ImposteurDescribingPhase.css';

// Keyframes for animated border glow (injected once)
const glowKeyframes = `
@keyframes imposteur-border-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(132,204,22,0.08), inset 0 0 20px rgba(132,204,22,0.02); }
  50% { box-shadow: 0 0 35px rgba(132,204,22,0.18), inset 0 0 30px rgba(132,204,22,0.04); }
}
`;

export default function ImposteurDescribingPhase({
  currentSubRound,
  descriptions,
  players,
  alivePlayers,
  amIAlive,
  isMyTurn,
  currentTurnPlayer,
  settings,
  clueInput,
  setClueInput,
  inputRef,
  onSubmitClue,
  onOralNext,
  myRole,
  tieMessage,
  ACCENT = '#84cc16',
  ACCENT_LIGHT = '#a3e635',
}) {
  const hasClues = descriptions && Object.keys(descriptions).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="idp-container"
    >
      {/* Inject glow keyframes */}
      <style dangerouslySetInnerHTML={{ __html: glowKeyframes }} />

      {/* Round indicator pill */}
      <div className="idp-round-pill-wrapper">
        <div className="idp-round-pill">
          <span className="idp-round-pill-text">
            Tour {currentSubRound}
          </span>
        </div>
      </div>

      {/* Tie message from previous round */}
      {tieMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="idp-tie-message"
        >
          {tieMessage}
        </motion.div>
      )}

      {/* Previous clues */}
      {hasClues && (
        <ImposteurClueWall
          clues={descriptions}
          players={players}
          subRound={currentSubRound}
        />
      )}

      {/* Word reminder card */}
      {myRole && amIAlive && (
        <div className="idp-role-card-wrapper">
          <ImposteurRoleCard word={myRole.word} />
        </div>
      )}

      {/* Eliminated spectator banner */}
      {!amIAlive && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="idp-eliminated-banner"
        >
          <EyeSlash size={18} weight="bold" className="idp-eliminated-icon" />
          <span className="idp-eliminated-text">
            Tu es éliminé — mode spectateur
          </span>
        </motion.div>
      )}

      {/* Current turn card */}
      {amIAlive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`idp-turn-card ${isMyTurn ? 'idp-turn-card--active' : 'idp-turn-card--waiting'}`}
        >
          {isMyTurn ? (
            <MyTurnContent
              settings={settings}
              clueInput={clueInput}
              setClueInput={setClueInput}
              inputRef={inputRef}
              onSubmitClue={onSubmitClue}
              onOralNext={onOralNext}
              ACCENT={ACCENT}
              ACCENT_LIGHT={ACCENT_LIGHT}
            />
          ) : (
            <WaitingContent currentTurnPlayer={currentTurnPlayer} />
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── My Turn sub-component ── */
function MyTurnContent({ settings, clueInput, setClueInput, inputRef, onSubmitClue, onOralNext, ACCENT, ACCENT_LIGHT }) {
  const isWritten = settings?.clueMode === 'written';

  return (
    <>
      <div className="idp-my-turn-title">
        {isWritten
          ? <PencilSimple size={20} weight="bold" style={{ color: ACCENT }} />
          : <Microphone size={20} weight="bold" style={{ color: ACCENT }} />
        }
        C'est ton tour !
      </div>

      {isWritten ? (
        <>
          <div className="idp-written-hint">
            Donne un indice d'un mot
          </div>

          <div className="idp-input-row">
            <input
              ref={inputRef}
              type="text"
              value={clueInput}
              onChange={(e) => setClueInput(e.target.value.slice(0, 30))}
              onKeyDown={(e) => e.key === 'Enter' && onSubmitClue()}
              placeholder="Ton indice..."
              maxLength={30}
              className="idp-clue-input"
            />
            <motion.button
              onClick={onSubmitClue}
              disabled={!clueInput?.trim()}
              whileTap={{ scale: 0.95 }}
              className="idp-submit-btn"
              style={{
                background: clueInput?.trim() ? ACCENT : 'rgba(238,242,255,0.06)',
                color: clueInput?.trim() ? '#000' : 'rgba(238,242,255,0.25)',
                cursor: clueInput?.trim() ? 'pointer' : 'default',
              }}
            >
              OK
            </motion.button>
          </div>

          <div className="idp-char-count">
            {clueInput?.length || 0}/30
          </div>
        </>
      ) : (
        <>
          <div className="idp-oral-hint">
            Dis ton indice à voix haute, puis appuie sur Suivant
          </div>

          <motion.button
            onClick={onOralNext}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="idp-oral-next-btn"
            style={{
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
              boxShadow: `0 4px 24px ${ACCENT}44`,
            }}
          >
            Suivant
            <ArrowRight size={18} weight="bold" />
          </motion.button>
        </>
      )}
    </>
  );
}

/* ── Waiting for another player sub-component ── */
function WaitingContent({ currentTurnPlayer }) {
  return (
    <>
      <div className="idp-waiting-label">
        C'est au tour de
      </div>

      <div className="idp-waiting-name">
        {currentTurnPlayer?.name || '...'}
      </div>

      <motion.div
        animate={{ opacity: [0.25, 0.65, 0.25] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        className="idp-waiting-dots"
      >
        En attente...
      </motion.div>
    </>
  );
}
