"use client";

import { motion } from 'framer-motion';
import { Microphone, PencilSimple, ArrowRight, EyeSlash } from '@phosphor-icons/react';
import ImposteurClueWall from '@/components/game/ImposteurClueWall';
import ImposteurRoleCard from '@/components/game/ImposteurRoleCard';

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
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      {/* Inject glow keyframes */}
      <style dangerouslySetInnerHTML={{ __html: glowKeyframes }} />

      {/* Round indicator pill */}
      <div style={{
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '5px 14px',
          borderRadius: '20px',
          background: 'rgba(238,242,255,0.04)',
          border: '1px solid rgba(238,242,255,0.08)',
        }}>
          <span style={{
            fontSize: '0.7rem', fontWeight: 700,
            color: 'rgba(238,242,255,0.4)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>
            Tour {currentSubRound}
          </span>
        </div>
      </div>

      {/* Tie message from previous round */}
      {tieMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '12px 16px', borderRadius: '14px',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.2)',
            textAlign: 'center',
            fontSize: '0.82rem', fontWeight: 600,
            color: '#fbbf24',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            lineHeight: 1.4,
          }}
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
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ImposteurRoleCard word={myRole.word} />
        </div>
      )}

      {/* Eliminated spectator banner */}
      {!amIAlive && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center',
            padding: '14px 16px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          }}
        >
          <EyeSlash size={18} weight="bold" style={{ color: '#f87171' }} />
          <span style={{
            fontSize: '0.85rem', fontWeight: 700, color: '#f87171',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>
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
          style={{
            background: 'rgba(8,12,24,0.85)',
            backdropFilter: 'blur(16px)',
            border: `1.5px solid ${isMyTurn ? 'rgba(132,204,22,0.3)' : 'rgba(238,242,255,0.06)'}`,
            borderRadius: '20px',
            padding: '28px 20px',
            textAlign: 'center',
            ...(isMyTurn ? {
              animation: 'imposteur-border-glow 3s ease-in-out infinite',
            } : {}),
          }}
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
      <div style={{
        fontFamily: "var(--font-title, 'Bungee'), cursive",
        fontSize: '1.1rem',
        color: '#ffffff',
        textShadow: '0 0 20px rgba(132,204,22,0.25)',
        marginBottom: '16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
      }}>
        {isWritten
          ? <PencilSimple size={20} weight="bold" style={{ color: ACCENT }} />
          : <Microphone size={20} weight="bold" style={{ color: ACCENT }} />
        }
        C'est ton tour !
      </div>

      {isWritten ? (
        <>
          <div style={{
            fontSize: '0.78rem',
            color: 'rgba(238,242,255,0.55)',
            fontWeight: 600,
            marginBottom: '14px',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>
            Donne un indice d'un mot
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              ref={inputRef}
              type="text"
              value={clueInput}
              onChange={(e) => setClueInput(e.target.value.slice(0, 30))}
              onKeyDown={(e) => e.key === 'Enter' && onSubmitClue()}
              placeholder="Ton indice..."
              maxLength={30}
              style={{
                flex: 1,
                padding: '13px 14px',
                borderRadius: '12px',
                border: '1.5px solid rgba(132,204,22,0.2)',
                background: 'rgba(238,242,255,0.05)',
                color: '#eef2ff',
                fontSize: '0.9rem',
                fontWeight: 700,
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => { e.target.style.borderColor = 'rgba(132,204,22,0.45)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(132,204,22,0.2)'; }}
            />
            <motion.button
              onClick={onSubmitClue}
              disabled={!clueInput?.trim()}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '13px 20px',
                borderRadius: '12px',
                border: 'none',
                background: clueInput?.trim() ? ACCENT : 'rgba(238,242,255,0.06)',
                color: clueInput?.trim() ? '#000' : 'rgba(238,242,255,0.25)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: clueInput?.trim() ? 'pointer' : 'default',
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                transition: 'all 0.2s ease',
              }}
            >
              OK
            </motion.button>
          </div>

          <div style={{
            fontSize: '0.68rem',
            color: 'rgba(238,242,255,0.25)',
            marginTop: '6px',
            textAlign: 'right',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
          }}>
            {clueInput?.length || 0}/30
          </div>
        </>
      ) : (
        <>
          <div style={{
            fontSize: '0.85rem',
            color: 'rgba(238,242,255,0.55)',
            fontWeight: 600,
            marginBottom: '18px',
            fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
            lineHeight: 1.5,
          }}>
            Dis ton indice à voix haute, puis appuie sur Suivant
          </div>

          <motion.button
            onClick={onOralNext}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '14px',
              border: 'none',
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
              color: '#000',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              boxShadow: `0 4px 24px ${ACCENT}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
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
      <div style={{
        fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
        fontSize: '0.85rem',
        color: 'rgba(238,242,255,0.55)',
        fontWeight: 600,
        marginBottom: '6px',
      }}>
        C'est au tour de
      </div>

      <div style={{
        fontFamily: "var(--font-title, 'Bungee'), cursive",
        fontSize: '1.3rem',
        color: '#ffffff',
        textShadow: '0 0 20px rgba(132,204,22,0.25)',
      }}>
        {currentTurnPlayer?.name || '...'}
      </div>

      <motion.div
        animate={{ opacity: [0.25, 0.65, 0.25] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          marginTop: '14px',
          fontSize: '0.78rem',
          color: 'rgba(238,242,255,0.4)',
          fontWeight: 600,
          fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
        }}
      >
        En attente...
      </motion.div>
    </>
  );
}
