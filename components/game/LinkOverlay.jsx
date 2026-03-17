'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Link as LinkIcon, Clock, Check, X } from 'lucide-react';
import { HandPalm } from '@phosphor-icons/react';

const ACCENT = '#ec4899';

/**
 * LinkOverlay - Unified UI for all link phases
 *
 * Renders inside the play/defend page when a link is active.
 * Handles: clue input, waiting timer, candidate selection, countdown,
 * word input (written mode), reveal, result display.
 *
 * @param {Object} props
 * @param {Object} props.link - useActiveLink return object
 * @param {string} props.mode - 'oral' | 'ecrit'
 * @param {Array} props.players
 * @param {string} props.myUid
 * @param {string} props.myRole - 'attacker' | 'defender'
 */
export default function LinkOverlay({ link, mode, players = [], myUid, myRole = 'attacker', revealedPrefix = '' }) {
  const [clueInput, setClueInput] = useState('');
  const [linkWordInput, setLinkWordInput] = useState('');
  const [interceptInput, setInterceptInput] = useState('');
  const [showInterceptInput, setShowInterceptInput] = useState(false);
  const [prefixError, setPrefixError] = useState('');

  const {
    activeLink, phase, isInitiator, isChosen, isInLink, candidates,
    failedInterceptors,
    countdown, waitingTimeLeft, clueTimeLeft, waitingProgress,
    WAITING_DURATION, CLUE_DURATION,
    submitClue, requestLink, chooseCandidate, submitLinkWord,
    startIntercept, intercept, confirmIntercept, validateOralResult,
  } = link;

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
    // Validate prefix in written mode
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
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        background: 'rgba(236,72,153,0.06)',
        border: '1px solid rgba(236,72,153,0.15)',
        borderRadius: '16px',
        padding: '16px',
        marginBottom: '16px', flexShrink: 0,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Progress bar for waiting phase */}
      {phase === 'waiting' && (
        <motion.div
          style={{
            position: 'absolute', top: 0, left: 0,
            height: '3px', borderRadius: '3px',
            background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}88)`,
            boxShadow: `0 0 8px ${ACCENT}44`,
          }}
          initial={{ width: '100%' }}
          animate={{ width: `${waitingProgress * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      )}

      {/* Clue timer bar */}
      {phase === 'clue' && (
        <motion.div
          style={{
            position: 'absolute', top: 0, left: 0,
            height: '3px', borderRadius: '3px',
            background: 'linear-gradient(90deg, #f59e0b, #f59e0b88)',
          }}
          initial={{ width: '100%' }}
          animate={{ width: `${(clueTimeLeft / CLUE_DURATION) * 100}%` }}
          transition={{ duration: 0.1 }}
        />
      )}

      {/* ── CLUE PHASE ── */}
      {phase === 'clue' && isInitiator && (
        <div>
          <div style={{
            fontSize: '0.75rem', fontWeight: 700, color: ACCENT,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <Lightbulb size={14} />
            Ton indice (1 mot)
            <span style={{
              marginLeft: 'auto', fontFamily: "var(--font-title, 'Bungee'), cursive",
              color: clueTimeLeft < 2000 ? '#ef4444' : '#f59e0b',
            }}>
              {Math.ceil(clueTimeLeft / 1000)}s
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={clueInput}
              onChange={(e) => setClueInput(e.target.value)}
              placeholder="Ton indice..."
              autoFocus
              maxLength={30}
              style={{
                flex: 1, padding: '12px 14px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(236,72,153,0.2)',
                borderRadius: '10px', outline: 'none',
                color: '#eef2ff', fontSize: '0.95rem',
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                fontWeight: 600,
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitClue(); }}
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmitClue}
              disabled={!clueInput.trim()}
              style={{
                padding: '12px 18px', borderRadius: '10px',
                background: clueInput.trim() ? ACCENT : 'rgba(238,242,255,0.06)',
                border: 'none',
                color: clueInput.trim() ? '#fff' : 'rgba(238,242,255,0.3)',
                fontWeight: 700, fontSize: '0.85rem', cursor: clueInput.trim() ? 'pointer' : 'not-allowed',
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
              }}
            >
              Go
            </motion.button>
          </div>
        </div>
      )}

      {/* Clue phase - others wait */}
      {phase === 'clue' && !isInitiator && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.5)' }}>
            <strong style={{ color: ACCENT }}>{initiatorName}</strong> prépare son indice…
          </div>
        </div>
      )}

      {/* ── WAITING PHASE ── */}
      {phase === 'waiting' && (
        <div>
          {/* Clue display */}
          {activeLink.clue && activeLink.clue !== '(oral)' ? (
            <>
              <div style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.3rem', color: '#eef2ff',
                textAlign: 'center', marginBottom: '4px',
              }}>
                « {activeLink.clue} »
              </div>
              <div style={{
                fontSize: '0.72rem', color: 'rgba(238,242,255,0.4)',
                textAlign: 'center', marginBottom: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }}>
                Indice de {initiatorName}
                <span style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  color: waitingTimeLeft < 3000 ? '#ef4444' : ACCENT,
                  fontSize: '0.8rem',
                }}>
                  {Math.ceil(waitingTimeLeft / 1000)}s
                </span>
              </div>
            </>
          ) : (
            <div style={{
              textAlign: 'center', marginBottom: '14px',
            }}>
              <div style={{
                fontSize: '0.85rem', color: '#eef2ff', marginBottom: '4px', fontWeight: 600,
              }}>
                {initiatorName} a donné un indice !
              </div>
              <span style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                color: waitingTimeLeft < 3000 ? '#ef4444' : ACCENT,
                fontSize: '0.85rem',
              }}>
                {Math.ceil(waitingTimeLeft / 1000)}s
              </span>
            </div>
          )}

          {/* Link button (attacker, not initiator) */}
          {!isDefender && !isInitiator && !candidates.includes(myUid) && !activeLink.defenderIntercept && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={requestLink}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: `linear-gradient(135deg, ${ACCENT}, #9333ea)`,
                border: 'none', color: '#fff',
                fontSize: '0.9rem', fontWeight: 700,
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                textTransform: 'uppercase', letterSpacing: '0.05em',
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${ACCENT}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              <LinkIcon size={18} />
              Link !
            </motion.button>
          )}

          {/* Already requested */}
          {!isDefender && !isInitiator && candidates.includes(myUid) && (
            <div style={{
              textAlign: 'center', padding: '12px',
              background: `${ACCENT}15`, borderRadius: '12px',
              fontSize: '0.82rem', fontWeight: 700, color: ACCENT,
            }}>
              En attente de sélection…
            </div>
          )}

          {/* Initiator sees candidates */}
          {isInitiator && candidates.length > 0 && (
            <div>
              <div style={{
                fontSize: '0.72rem', fontWeight: 700, color: 'rgba(238,242,255,0.4)',
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px',
              }}>
                Qui veut link ? ({candidates.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {candidates.map(uid => (
                  <motion.button
                    key={uid}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => chooseCandidate(uid)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px', borderRadius: '12px',
                      background: `${ACCENT}12`,
                      border: `1px solid ${ACCENT}33`,
                      color: '#eef2ff', fontSize: '0.85rem', fontWeight: 600,
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      cursor: 'pointer',
                    }}
                  >
                    <LinkIcon size={14} color={ACCENT} />
                    {getPlayerName(uid)}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* No candidates yet (initiator) */}
          {isInitiator && candidates.length === 0 && !activeLink.defenderIntercept && (
            <div style={{
              textAlign: 'center', fontSize: '0.82rem',
              color: 'rgba(238,242,255,0.4)', padding: '8px',
            }}>
              En attente de joueurs…
            </div>
          )}
        </div>
      )}

      {/* ── CHOOSING PHASE (multiple candidates) ── */}
      {phase === 'choosing' && (
        <div>
          <div style={{
            fontSize: '0.75rem', fontWeight: 700, color: ACCENT,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px',
          }}>
            « {activeLink.clue} » — Choisis ton partenaire
          </div>
          {isInitiator ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {candidates.map(uid => (
                <motion.button
                  key={uid}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => chooseCandidate(uid)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 16px', borderRadius: '12px',
                    background: `${ACCENT}12`,
                    border: `1px solid ${ACCENT}33`,
                    color: '#eef2ff', fontSize: '0.9rem', fontWeight: 600,
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    cursor: 'pointer',
                  }}
                >
                  <LinkIcon size={16} color={ACCENT} />
                  {getPlayerName(uid)}
                </motion.button>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', fontSize: '0.82rem', color: 'rgba(238,242,255,0.5)' }}>
              {initiatorName} choisit son partenaire…
            </div>
          )}
        </div>
      )}

      {/* ── DEFENDER: already failed on this link ── */}
      {['waiting', 'choosing', 'countdown'].includes(phase) && isDefender && !activeLink.defenderIntercept && failedInterceptors?.includes(myUid) && (
        <div style={{
          marginTop: '10px', padding: '12px', borderRadius: '12px',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.15)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: 600 }}>
            Tu t'es trompé sur ce link
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(238,242,255,0.35)', marginTop: '4px' }}>
            Tu ne peux plus intercepter cette manche
          </div>
        </div>
      )}

      {/* ── DEFENDER INTERCEPTION (visible during waiting, choosing, countdown) ── */}
      {['waiting', 'choosing', 'countdown'].includes(phase) && isDefender && !activeLink.defenderIntercept && !failedInterceptors?.includes(myUid) && (
        <>
          {mode === 'oral' ? (
            /* ── ORAL: one-tap intercept, defender says word out loud ── */
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => intercept(null)}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none', color: '#fff',
                fontSize: '0.85rem', fontWeight: 700,
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
                marginTop: '10px',
              }}
            >
              <HandPalm size={16} />
              J'intercepte !
            </motion.button>
          ) : (
            /* ── ÉCRIT: click pauses timer immediately, then type word ── */
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => startIntercept()}
              style={{
                width: '100%', padding: '12px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none', color: '#fff',
                fontSize: '0.85rem', fontWeight: 700,
                fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
                marginTop: '10px',
              }}
            >
              <HandPalm size={16} />
              J'intercepte !
            </motion.button>
          )}
        </>
      )}

      {/* Defender typing intercept word (écrit mode) — visible to ALL */}
      {activeLink.defenderIntercept && activeLink.defenderIntercept.confirmed === 'typing' && (() => {
        const defenderName = getPlayerName(activeLink.defenderIntercept.defenderUid);
        const isMe = activeLink.defenderIntercept.defenderUid === myUid;
        return (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '12px', padding: '14px',
              marginTop: '10px',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              marginBottom: '10px',
            }}>
              <HandPalm size={14} color="#ef4444" />
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, color: '#ef4444',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Interception
              </span>
            </div>

            {isMe ? (
              /* ── INTERCEPTING DEFENDER: type the word ── */
              <>
                <div style={{
                  fontSize: '0.82rem', color: '#eef2ff', marginBottom: '10px',
                  textAlign: 'center', lineHeight: 1.4,
                }}>
                  Quel mot essaient-ils de communiquer ?
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={interceptInput}
                    onChange={(e) => setInterceptInput(e.target.value)}
                    placeholder="Le mot est..."
                    autoFocus
                    className="input-dark"
                    style={{
                      flex: 1, padding: '10px 12px',
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '10px', outline: 'none',
                      color: '#eef2ff', fontSize: '0.9rem',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      fontWeight: 600, textTransform: 'uppercase',
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && interceptInput.trim()) handleIntercept(); }}
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleIntercept}
                    disabled={!interceptInput.trim()}
                    style={{
                      padding: '10px 14px', borderRadius: '10px',
                      background: interceptInput.trim() ? '#ef4444' : 'rgba(238,242,255,0.06)',
                      border: 'none',
                      color: interceptInput.trim() ? '#fff' : 'rgba(238,242,255,0.3)',
                      fontWeight: 700, cursor: interceptInput.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    OK
                  </motion.button>
                </div>
              </>
            ) : (
              /* ── EVERYONE ELSE: spectator ── */
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '0.85rem', color: '#eef2ff', lineHeight: 1.5,
                }}>
                  <strong style={{ color: '#ef4444' }}>{defenderName}</strong> intercepte le link !
                </div>
                <div style={{
                  fontSize: '0.78rem', color: 'rgba(238,242,255,0.45)', fontStyle: 'italic',
                  marginTop: '4px',
                }}>
                  En train d'écrire sa réponse…
                </div>
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* Defender interception pending — visible to ALL players */}
      {activeLink.defenderIntercept && activeLink.defenderIntercept.confirmed === 'pending' && (() => {
        const defenderName = getPlayerName(activeLink.defenderIntercept.defenderUid);
        const guessedWord = activeLink.defenderIntercept.guessedWord;
        const isOralIntercept = guessedWord === '(oral)';
        return (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '12px', padding: '14px',
              marginTop: '10px',
            }}
          >
            {/* Header — everyone sees */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              marginBottom: '10px',
            }}>
              <HandPalm size={14} color="#ef4444" />
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, color: '#ef4444',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                Interception
              </span>
            </div>

            {isInitiator ? (
              /* ── INITIATOR: must confirm ── */
              <>
                <div style={{
                  fontSize: '0.85rem', color: '#eef2ff', textAlign: 'center',
                  marginBottom: '12px', lineHeight: 1.5,
                }}>
                  {isOralIntercept ? (
                    <>
                      Est-ce que <strong style={{ color: '#ef4444' }}>{defenderName}</strong> a trouvé ton mot ?
                    </>
                  ) : (
                    <>
                      <strong style={{ color: '#ef4444' }}>{defenderName}</strong> pense que tu essaies de faire deviner{' '}
                      <strong style={{
                        color: '#ef4444',
                        fontFamily: "var(--font-title, 'Bungee'), cursive",
                        fontSize: '1.05rem',
                      }}>
                        « {guessedWord} »
                      </strong>
                      <br />
                      <span style={{ color: 'rgba(238,242,255,0.5)', fontSize: '0.78rem' }}>
                        C'est bien ton mot ?
                      </span>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => confirmIntercept(true)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px',
                      background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                      color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    <Check size={14} /> Oui, c'est ça
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => confirmIntercept(false)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px',
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                      color: '#22c55e', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    <X size={14} /> Non, raté
                  </motion.button>
                </div>
              </>
            ) : activeLink.defenderIntercept.defenderUid === myUid ? (
              /* ── THE INTERCEPTING DEFENDER: waiting for confirmation ── */
              <div style={{ textAlign: 'center' }}>
                {isOralIntercept ? (
                  <div style={{
                    fontSize: '0.85rem', color: '#eef2ff', marginBottom: '6px',
                  }}>
                    Dis à haute voix le mot que tu penses avoir trouvé !
                  </div>
                ) : (
                  <div style={{
                    fontSize: '0.85rem', color: '#eef2ff', marginBottom: '6px',
                  }}>
                    Tu as proposé{' '}
                    <strong style={{
                      color: '#ef4444',
                      fontFamily: "var(--font-title, 'Bungee'), cursive",
                    }}>
                      « {guessedWord} »
                    </strong>
                  </div>
                )}
                <div style={{
                  fontSize: '0.78rem', color: 'rgba(238,242,255,0.45)', fontStyle: 'italic',
                }}>
                  En attente de la réponse de {initiatorName}…
                </div>
              </div>
            ) : (
              /* ── OTHER PLAYERS (attackers + other defenders): spectator view ── */
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '0.85rem', color: '#eef2ff', lineHeight: 1.5,
                }}>
                  <strong style={{ color: '#ef4444' }}>{defenderName}</strong> intercepte le link !
                </div>
                <div style={{
                  fontSize: '0.78rem', color: 'rgba(238,242,255,0.45)', fontStyle: 'italic',
                  marginTop: '4px',
                }}>
                  En attente de la réponse de {initiatorName}…
                </div>
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* ── COUNTDOWN PHASE ── */}
      {phase === 'countdown' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '0.72rem', fontWeight: 700, color: 'rgba(238,242,255,0.4)',
            letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px',
          }}>
            {initiatorName} ↔ {chosenName}
          </div>

          {/* Countdown number */}
          <motion.div
            key={countdown}
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: '3rem', color: ACCENT,
              textShadow: `0 0 30px ${ACCENT}88`,
              lineHeight: 1.2,
            }}
          >
            {countdown > 0 ? countdown : ''}
          </motion.div>

          {countdown === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.5rem', color: '#22c55e',
                textShadow: '0 0 20px rgba(34,197,94,0.5)',
              }}
            >
              {mode === 'ecrit' ? 'RÉVÉLATION !' : 'DITES VOTRE MOT !'}
            </motion.div>
          )}

          {/* Written mode: input for linked players */}
          {mode === 'ecrit' && isInLink && countdown > 0 && (
            <div style={{ marginTop: '14px', maxWidth: '280px', margin: '14px auto 0' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={linkWordInput}
                  onChange={(e) => { setLinkWordInput(e.target.value); setPrefixError(''); }}
                  placeholder={revealedPrefix ? `${revealedPrefix.toUpperCase()}...` : 'Ton mot...'}
                  autoFocus
                  style={{
                    flex: 1, padding: '12px 14px',
                    background: 'rgba(0,0,0,0.3)',
                    border: `1px solid ${prefixError ? 'rgba(239,68,68,0.5)' : `${ACCENT}33`}`,
                    borderRadius: '10px', outline: 'none',
                    color: '#eef2ff', fontSize: '1rem',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                    fontWeight: 700, textAlign: 'center', textTransform: 'uppercase',
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitWord(); }}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmitWord}
                  disabled={!linkWordInput.trim()}
                  style={{
                    padding: '12px 16px', borderRadius: '10px',
                    background: linkWordInput.trim() ? ACCENT : 'rgba(238,242,255,0.06)',
                    border: 'none',
                    color: linkWordInput.trim() ? '#fff' : 'rgba(238,242,255,0.3)',
                    fontWeight: 700, cursor: linkWordInput.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  OK
                </motion.button>
              </div>
              {prefixError && (
                <div style={{
                  marginTop: '6px', fontSize: '0.75rem', color: '#ef4444',
                  fontWeight: 600, textAlign: 'center',
                }}>
                  {prefixError}
                </div>
              )}
            </div>
          )}

          {/* Written mode: word submitted indicator */}
          {mode === 'ecrit' && isInLink && (
            (isInitiator && activeLink.initiatorWord) || (isChosen && activeLink.responderWord)
          ) && (
            <div style={{
              marginTop: '10px', fontSize: '0.78rem', color: '#22c55e', fontWeight: 600,
            }}>
              ✓ Mot envoyé
            </div>
          )}
        </div>
      )}

      {/* ── REVEAL PHASE ── */}
      {phase === 'reveal' && (
        <div style={{ textAlign: 'center' }}>
          {mode === 'ecrit' ? (
            <>
              <div style={{
                fontSize: '0.72rem', fontWeight: 700, color: ACCENT,
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px',
              }}>
                Révélation
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(238,242,255,0.4)', marginBottom: '4px' }}>
                    {initiatorName}
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      fontFamily: "var(--font-title, 'Bungee'), cursive",
                      fontSize: '1.1rem', color: '#eef2ff',
                    }}
                  >
                    {activeLink.initiatorWord || '…'}
                  </motion.div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(238,242,255,0.4)', marginBottom: '4px' }}>
                    {chosenName}
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                      fontFamily: "var(--font-title, 'Bungee'), cursive",
                      fontSize: '1.1rem', color: '#eef2ff',
                    }}
                  >
                    {activeLink.responderWord || '…'}
                  </motion.div>
                </div>
              </div>
            </>
          ) : (
            // Oral mode: defender validates
            <>
              <div style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.3rem', color: '#eef2ff', marginBottom: '6px',
              }}>
                « {activeLink.clue} »
              </div>
              <div style={{
                fontSize: '0.78rem', color: 'rgba(238,242,255,0.4)', marginBottom: '12px',
              }}>
                {initiatorName} ↔ {chosenName} ont dit leur mot
              </div>

              {isDefender ? (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => validateOralResult(true)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px',
                      background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                      color: '#22c55e', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    <Check size={16} /> Même mot !
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => validateOralResult(false)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px',
                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                      color: '#ef4444', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    <X size={16} /> Pas le même
                  </motion.button>
                </div>
              ) : (
                <div style={{
                  fontSize: '0.82rem', color: 'rgba(238,242,255,0.5)',
                }}>
                  Le défenseur vérifie…
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── RESULT PHASE ── */}
      {phase === 'result' && (
        <div style={{ textAlign: 'center' }}>
          {activeLink.result === 'match' ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.5rem', color: '#22c55e',
                textShadow: '0 0 20px rgba(34,197,94,0.5)',
                marginBottom: '6px',
              }}>
                MATCH !
              </div>
              {isDefender ? (
                <div style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.5)' }}>
                  Utilise les boutons ci-dessous pour révéler ou non la lettre
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.5)' }}>
                  En attente de la décision du défenseur…
                </div>
              )}
            </motion.div>
          ) : activeLink.result === 'intercepted' ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.5rem', color: '#ef4444',
                textShadow: '0 0 20px rgba(239,68,68,0.5)',
                marginBottom: '6px',
              }}>
                INTERCEPTÉ !
              </div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.5)' }}>
                Le défenseur a deviné le mot
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div style={{
                fontFamily: "var(--font-title, 'Bungee'), cursive",
                fontSize: '1.3rem', color: '#f59e0b',
                textShadow: '0 0 15px rgba(245,158,11,0.4)',
                marginBottom: '6px',
              }}>
                PAS DE MATCH
              </div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(238,242,255,0.5)' }}>
                Pas le même mot…
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
