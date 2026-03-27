"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db, ref, onValue, onAuthStateChanged, signInAnonymously } from "@/lib/firebase";
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayers } from "@/lib/hooks/usePlayers";
import { useRoomGuard } from "@/lib/hooks/useRoomGuard";
import { usePlayerCleanup } from "@/lib/hooks/usePlayerCleanup";
import { useInactivityDetection } from "@/lib/hooks/useInactivityDetection";
import { useWakeLock } from "@/lib/hooks/useWakeLock";
import { useImposteurGame } from "@/lib/hooks/useImposteurGame";
import DisconnectAlert from "@/components/game/DisconnectAlert";
import GameStatusBanners from "@/components/game/GameStatusBanners";
import ImposteurRoleCard from "@/components/game/ImposteurRoleCard";
import ImposteurClueWall from "@/components/game/ImposteurClueWall";
import ImposteurVoteGrid from "@/components/game/ImposteurVoteGrid";
import ImposteurEliminationReveal from "@/components/game/ImposteurEliminationReveal";
import ImposteurMrWhiteGuess from "@/components/game/ImposteurMrWhiteGuess";

const ACCENT = '#e11d48';
const ACCENT_LIGHT = '#f43f5e';
const ROOM_PREFIX = 'rooms_imposteur';

export default function ImposteurPlay() {
  return <ImposteurPlayContent />;
}

export function ImposteurPlayContent({ overrideCode, overrideUid } = {}) {
  const params = useParams();
  const code = overrideCode || params?.code;
  const router = useRouter();

  const [myUid, setMyUid] = useState(overrideUid || null);
  const [isHost, setIsHost] = useState(false);
  const [clueInput, setClueInput] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const inputRef = useRef(null);

  const { players, me, activePlayers } = usePlayers({ roomCode: code, roomPrefix: ROOM_PREFIX });
  const alivePlayers = players.filter(p => p.alive !== false);
  const amIAlive = me?.alive !== false;

  const {
    meta, state, myRole, descriptions, votes, revealedRoles, roundScores,
    phase,
    markRoleSeen, startDescribing, submitClue, advanceToNextAliveTurn,
    submitVote, tallyVotesAndEliminate, submitMrWhiteGuess,
    resolveElimination, applyScores, startNextRound, endGame,
  } = useImposteurGame({ roomCode: code, myUid, isHost });

  useWakeLock({ enabled: true });

  useEffect(() => {
    if (overrideUid) { setMyUid(overrideUid); return; }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setMyUid(user.uid);
      else signInAnonymously(auth).catch(() => {});
    });
    return () => unsub();
  }, [overrideUid]);

  useEffect(() => {
    if (myUid && meta?.hostUid) setIsHost(myUid === meta.hostUid);
  }, [myUid, meta?.hostUid]);

  const { isHostTemporarilyDisconnected, hostDisconnectedAt } = useRoomGuard({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost,
  });

  const { markActive } = usePlayerCleanup({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, isHost, phase: 'playing',
  });

  useInactivityDetection({
    roomCode: code, roomPrefix: ROOM_PREFIX, playerUid: myUid, inactivityTimeout: 30000,
  });

  // Redirect to end page
  useEffect(() => {
    if (phase === 'ended') {
      router.push(`/imposteur/game/${code}/end`);
    }
  }, [phase, code, router]);

  // Auto-start describing after roles phase (host, after 8s)
  useEffect(() => {
    if (phase !== 'roles' || !isHost) return;
    const timer = setTimeout(() => {
      startDescribing();
    }, 8000);
    return () => clearTimeout(timer);
  }, [phase, isHost, startDescribing]);

  // Reset hasVoted when sub-round changes
  useEffect(() => {
    setHasVoted(false);
  }, [state?.currentSubRound]);

  // Check if I already voted this sub-round
  useEffect(() => {
    if (!myUid || !votes || !state?.currentSubRound) return;
    const subVotes = votes[state.currentSubRound] || {};
    if (subVotes[myUid]) setHasVoted(true);
  }, [myUid, votes, state?.currentSubRound]);

  const isMyTurn = state?.currentTurnUid === myUid;
  const settings = meta?.settings || {};
  const currentSubRound = state?.currentSubRound || 1;

  // Handle clue submission (written mode)
  const handleSubmitClue = useCallback(async () => {
    if (!clueInput.trim()) return;
    await submitClue(clueInput.trim());
    setClueInput('');
    await advanceToNextAliveTurn(alivePlayers);
  }, [clueInput, submitClue, advanceToNextAliveTurn, alivePlayers]);

  // Handle oral mode "next" button
  const handleOralNext = useCallback(async () => {
    await advanceToNextAliveTurn(alivePlayers);
  }, [advanceToNextAliveTurn, alivePlayers]);

  // Handle vote
  const handleVote = useCallback(async (targetUid) => {
    await submitVote(targetUid);
    setHasVoted(true);
  }, [submitVote]);

  // Check if all alive players have voted
  const subVotes = votes[currentSubRound] || {};
  const allVotesIn = Object.keys(subVotes).length >= alivePlayers.length;

  // Host: tally votes when all are in
  useEffect(() => {
    if (!allVotesIn || !isHost || phase !== 'voting') return;
    const timer = setTimeout(() => {
      tallyVotesAndEliminate(players);
    }, 2000); // 2s delay for dramatic reveal
    return () => clearTimeout(timer);
  }, [allVotesIn, isHost, phase, tallyVotesAndEliminate, players]);

  // Eliminated player data
  const lastEliminatedUid = state?.eliminatedThisRound?.slice(-1)?.[0];
  const eliminatedPlayer = players.find(p => p.uid === lastEliminatedUid);
  const eliminatedRole = revealedRoles?.[lastEliminatedUid];

  // Handle continue after elimination
  const handleContinueAfterElimination = useCallback(async () => {
    await applyScores(players);
    await resolveElimination(players);
  }, [applyScores, resolveElimination, players]);

  // Mr. White guess
  const isMrWhiteGuessing = state?.mrWhiteGuessing === true;
  const amIMrWhite = myRole?.role === 'mrwhite';
  const mrWhitePlayer = isMrWhiteGuessing ? eliminatedPlayer : null;

  const handleMrWhiteGuess = useCallback(async (guess) => {
    await submitMrWhiteGuess(guess);
    // Host will check win conditions after guess
    if (isHost) {
      setTimeout(() => handleContinueAfterElimination(), 3000);
    }
  }, [submitMrWhiteGuess, isHost, handleContinueAfterElimination]);

  // Round end: next round or end game
  const handleNextRound = useCallback(async () => {
    const totalRounds = settings.totalRounds || 1;
    const currentRound = state?.currentRound || 1;
    if (currentRound < totalRounds) {
      await startNextRound(players, state?.usedPairIds || []);
    } else {
      await endGame();
    }
  }, [settings, state, startNextRound, endGame, players]);

  // Current turn player name
  const currentTurnPlayer = players.find(p => p.uid === state?.currentTurnUid);

  // ── RENDER ──

  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      background: '#04060f', position: 'relative', overflow: 'hidden',
      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
    }}>
      {/* Background */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(225,29,72,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
      </div>

      <GameStatusBanners
        isHost={isHost}
        isHostTemporarilyDisconnected={isHostTemporarilyDisconnected}
        hostDisconnectedAt={hostDisconnectedAt}
      />
      <DisconnectAlert
        roomCode={code} roomPrefix={ROOM_PREFIX}
        playerUid={myUid} onReconnect={markActive}
      />

      <main style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '16px', position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>

        {/* ── ROLES PHASE ── */}
        {phase === 'roles' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', padding: '20px 0' }}
          >
            <div style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: '1.2rem', color: ACCENT_LIGHT,
              textShadow: `0 0 20px ${ACCENT}55`,
              textAlign: 'center',
            }}>
              Découvre ton rôle
            </div>
            {myRole && (
              <ImposteurRoleCard
                role={myRole.role}
                word={myRole.word}
                onSeen={markRoleSeen}
              />
            )}
            <div style={{
              fontSize: '0.75rem', color: 'rgba(238,242,255,0.3)',
              fontWeight: 600, textAlign: 'center',
            }}>
              La partie commence dans quelques secondes...
            </div>
          </motion.div>
        )}

        {/* ── DESCRIBING PHASE ── */}
        {phase === 'describing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Sub-round indicator */}
            <div style={{
              textAlign: 'center', fontSize: '0.7rem', fontWeight: 700,
              color: 'rgba(238,242,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              Tour {currentSubRound}
            </div>

            {/* Previous clues */}
            {Object.keys(descriptions).length > 0 && (
              <ImposteurClueWall
                clues={descriptions}
                players={players}
                subRound={currentSubRound}
              />
            )}

            {/* Eliminated indicator */}
            {!amIAlive && (
              <div style={{
                textAlign: 'center', padding: '16px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '14px',
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171' }}>
                  👀 Tu es éliminé — mode spectateur
                </span>
              </div>
            )}

            {/* Current turn display */}
            {amIAlive && (
              <div style={{
                background: 'rgba(12,14,28,0.92)',
                backdropFilter: 'blur(20px)',
                border: `1.5px solid ${isMyTurn ? `${ACCENT}40` : 'rgba(238,242,255,0.08)'}`,
                borderRadius: '18px',
                padding: '24px 20px',
                textAlign: 'center',
                boxShadow: isMyTurn ? `0 0 30px ${ACCENT}15` : 'none',
              }}>
                {isMyTurn ? (
                  <>
                    <div style={{
                      fontFamily: "var(--font-title, 'Bungee'), cursive",
                      fontSize: '1rem', color: ACCENT_LIGHT,
                      textShadow: `0 0 16px ${ACCENT}55`,
                      marginBottom: '12px',
                    }}>
                      C'est ton tour !
                    </div>

                    {settings.clueMode === 'written' ? (
                      <>
                        <div style={{
                          fontSize: '0.78rem', color: 'rgba(238,242,255,0.4)',
                          fontWeight: 600, marginBottom: '12px',
                        }}>
                          Donne un indice d'un mot
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            ref={inputRef}
                            type="text"
                            value={clueInput}
                            onChange={(e) => setClueInput(e.target.value.slice(0, 30))}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmitClue()}
                            placeholder="Ton indice..."
                            maxLength={30}
                            style={{
                              flex: 1, padding: '12px 14px',
                              borderRadius: '12px',
                              border: `1.5px solid ${ACCENT}30`,
                              background: 'rgba(238,242,255,0.05)',
                              color: '#eef2ff', fontSize: '0.9rem', fontWeight: 700,
                              fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                              outline: 'none',
                            }}
                          />
                          <motion.button
                            onClick={handleSubmitClue}
                            disabled={!clueInput.trim()}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              padding: '12px 20px', borderRadius: '12px',
                              border: 'none',
                              background: clueInput.trim() ? ACCENT : 'rgba(238,242,255,0.06)',
                              color: clueInput.trim() ? '#fff' : 'rgba(238,242,255,0.3)',
                              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                            }}
                          >
                            OK
                          </motion.button>
                        </div>
                        <div style={{
                          fontSize: '0.68rem', color: 'rgba(238,242,255,0.25)',
                          marginTop: '6px', textAlign: 'right',
                        }}>
                          {clueInput.length}/30
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{
                          fontSize: '0.85rem', color: 'rgba(238,242,255,0.5)',
                          fontWeight: 600, marginBottom: '16px',
                        }}>
                          Dis ton indice à voix haute, puis appuie sur Suivant
                        </div>
                        <motion.button
                          onClick={handleOralNext}
                          whileTap={{ scale: 0.97 }}
                          style={{
                            width: '100%', padding: '14px', borderRadius: '14px',
                            border: 'none',
                            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
                            color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                            boxShadow: `0 4px 20px ${ACCENT}44`,
                          }}
                        >
                          Suivant →
                        </motion.button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{
                      fontFamily: "var(--font-title, 'Bungee'), cursive",
                      fontSize: '0.95rem', color: 'rgba(238,242,255,0.6)',
                      marginBottom: '8px',
                    }}>
                      C'est au tour de
                    </div>
                    <div style={{
                      fontFamily: "var(--font-title, 'Bungee'), cursive",
                      fontSize: '1.3rem', color: '#fff',
                    }}>
                      {currentTurnPlayer?.name || '...'}
                    </div>
                    <motion.div
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        marginTop: '12px', fontSize: '0.78rem',
                        color: 'rgba(238,242,255,0.3)', fontWeight: 600,
                      }}
                    >
                      En attente...
                    </motion.div>
                  </>
                )}
              </div>
            )}

            {/* Host: advance button for oral mode (if current player is disconnected) */}
            {isHost && settings.clueMode === 'oral' && !isMyTurn && (
              <motion.button
                onClick={handleOralNext}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '10px', borderRadius: '10px',
                  border: '1px solid rgba(238,242,255,0.1)',
                  background: 'rgba(238,242,255,0.04)',
                  color: 'rgba(238,242,255,0.4)',
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                ⏭️ Forcer suivant (hôte)
              </motion.button>
            )}
          </motion.div>
        )}

        {/* ── VOTING PHASE ── */}
        {phase === 'voting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div style={{
              textAlign: 'center',
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: '1.1rem', color: ACCENT_LIGHT,
              textShadow: `0 0 16px ${ACCENT}55`,
            }}>
              Qui est l'imposteur ?
            </div>

            {/* Clue wall for reference (written mode only) */}
            {settings.clueMode === 'written' && (
              <ImposteurClueWall
                clues={descriptions}
                players={players}
                subRound={currentSubRound}
              />
            )}

            {/* Vote grid */}
            {amIAlive ? (
              <ImposteurVoteGrid
                players={alivePlayers}
                myUid={myUid}
                votes={votes}
                subRound={currentSubRound}
                hasVoted={hasVoted}
                onVote={handleVote}
                allVotesIn={allVotesIn}
                isHost={isHost}
              />
            ) : (
              <div style={{
                textAlign: 'center', padding: '16px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '14px',
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171' }}>
                  👀 Tu observes le vote en spectateur
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* ── ELIMINATION PHASE ── */}
        {phase === 'elimination' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Mr. White guess */}
            {isMrWhiteGuessing ? (
              <ImposteurMrWhiteGuess
                isMe={amIMrWhite && lastEliminatedUid === myUid}
                onSubmitGuess={handleMrWhiteGuess}
                mrWhiteGuess={state?.mrWhiteGuess}
                mrWhiteGuessCorrect={state?.mrWhiteGuessCorrect}
                playerName={eliminatedPlayer?.name}
              />
            ) : state?.mrWhiteGuess !== null && state?.mrWhiteGuess !== undefined ? (
              // Show Mr. White guess result then continue
              <ImposteurMrWhiteGuess
                isMe={false}
                mrWhiteGuess={state.mrWhiteGuess}
                mrWhiteGuessCorrect={state.mrWhiteGuessCorrect}
                playerName={eliminatedPlayer?.name}
              />
            ) : (
              <ImposteurEliminationReveal
                eliminatedPlayer={eliminatedPlayer}
                eliminatedRole={eliminatedRole}
                isMrWhiteGuessing={isMrWhiteGuessing}
                onContinue={handleContinueAfterElimination}
                isHost={isHost}
              />
            )}
          </motion.div>
        )}

        {/* ── ROUND END PHASE ── */}
        {phase === 'roundEnd' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '24px', padding: '20px 0', textAlign: 'center',
            }}
          >
            {/* Winner announcement */}
            <div style={{ fontSize: '3rem' }}>
              {state?.winner === 'civilians' ? '🎉' : '🕵️'}
            </div>
            <div style={{
              fontFamily: "var(--font-title, 'Bungee'), cursive",
              fontSize: 'clamp(1.2rem, 5vw, 1.8rem)',
              color: state?.winner === 'civilians' ? '#4ade80' : ACCENT_LIGHT,
              textShadow: `0 0 20px ${state?.winner === 'civilians' ? '#4ade8055' : `${ACCENT}55`}`,
            }}>
              {state?.winner === 'civilians' ? 'Civils gagnent !' : 'Imposteurs gagnent !'}
            </div>
            <div style={{
              fontSize: '0.82rem', color: 'rgba(238,242,255,0.5)', fontWeight: 600,
            }}>
              {state?.winReason === 'all_eliminated' && 'Tous les imposteurs ont été démasqués !'}
              {state?.winReason === 'outnumbered' && 'Les imposteurs sont en supériorité numérique !'}
              {state?.winReason === 'mr_white_guess' && 'Mr. White a deviné le mot des civils !'}
            </div>

            {/* Word pair reveal */}
            <div style={{
              background: 'rgba(12,14,28,0.92)',
              border: '1px solid rgba(238,242,255,0.1)',
              borderRadius: '16px',
              padding: '16px 20px',
              width: '100%', maxWidth: '320px',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(238,242,255,0.35)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Les mots
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#3b82f6', fontWeight: 700, marginBottom: '4px' }}>Civils</div>
                  <div style={{ fontFamily: "var(--font-title, 'Bungee'), cursive", fontSize: '1rem', color: '#fff' }}>
                    {state?.wordPair?.civilian}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: ACCENT_LIGHT, fontWeight: 700, marginBottom: '4px' }}>Imposteur</div>
                  <div style={{ fontFamily: "var(--font-title, 'Bungee'), cursive", fontSize: '1rem', color: '#fff' }}>
                    {state?.wordPair?.undercover}
                  </div>
                </div>
              </div>
            </div>

            {/* All revealed roles */}
            <div style={{
              background: 'rgba(12,14,28,0.92)',
              border: '1px solid rgba(238,242,255,0.08)',
              borderRadius: '16px',
              padding: '14px 16px',
              width: '100%', maxWidth: '320px',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(238,242,255,0.35)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Rôles
              </div>
              {players.map(p => {
                const role = revealedRoles?.[p.uid];
                const roleLabel = role?.role === 'civilian' ? '🙂 Civil' : role?.role === 'undercover' ? '🕵️ Imposteur' : role?.role === 'mrwhite' ? '👻 Mr. White' : '—';
                return (
                  <div key={p.uid} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid rgba(238,242,255,0.04)',
                  }}>
                    <span style={{ fontSize: '0.82rem', color: '#eef2ff', fontWeight: 600 }}>{p.name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'rgba(238,242,255,0.5)' }}>{roleLabel}</span>
                  </div>
                );
              })}
            </div>

            {/* Next round / End button (host) */}
            {isHost && (
              <motion.button
                onClick={handleNextRound}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '14px 32px', borderRadius: '14px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_LIGHT})`,
                  color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: `0 4px 20px ${ACCENT}44`,
                }}
              >
                {(state?.currentRound || 1) < (settings.totalRounds || 1)
                  ? `Manche suivante (${state?.currentRound || 1}/${settings.totalRounds || 1})`
                  : 'Voir les résultats'
                }
              </motion.button>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
