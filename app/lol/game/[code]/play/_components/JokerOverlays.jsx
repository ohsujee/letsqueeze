'use client';

/**
 * JokerOverlays — Joker selection modal + 3 active screens (performer/partner/spectator)
 * All joker JSX extracted from play/page.jsx. Logic stays in parent.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Microphone, MaskHappy, UsersThree, ArrowLeft, Play, Lock, X } from '@phosphor-icons/react';
import { STANDUP_SCRIPTS } from '@/data/lol/standup';
import { SCENES } from '@/data/lol/scenes';
import { COLLECTIVE_GAMES } from '@/data/lol/collective';
import RenderSceneScript from '../RenderSceneScript';

const ACCENT = '#EF4444';

export default function JokerOverlays({
  // Selection modal
  showJokerModal, setShowJokerModal, jokerTab, setJokerTab,
  selectedJoker, setSelectedJoker, showPartnerSelect, setShowPartnerSelect,
  selectedPartners, setSelectedPartners,
  jokerModalRef, handleJokerDragDown, handleJokerDragMove, handleJokerDragUp, handleJokerDragCancel,
  selectJokerContent, launchJoker, usedJokerIds, isPro, activePCount,
  // Active screens
  state, myUid, players, isHost, currentJoker, isJokerActive, isMyJoker,
  isMyPartnerInJoker, myJokerRole, currentVote, endJoker, me,
}) {
  return (
    <>
      {/* JOKER SELECTION MODAL — Bottom sheet style */}
      <AnimatePresence>
        {showJokerModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowJokerModal(false); setSelectedJoker(null); }}
              style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                background: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              }}
            />
            {/* Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                position: 'fixed', left: 0, right: 0, bottom: 0,
                top: 'calc(56px + max(env(safe-area-inset-top, 0px), var(--safe-area-top-fallback, 0px)))',
                zIndex: 9999,
                background: '#0a0610',
                borderRadius: '24px 24px 0 0',
                border: '1px solid rgba(255,215,0,0.15)',
                borderBottom: 'none',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 -10px 50px rgba(0,0,0,0.6), 0 0 60px rgba(255,215,0,0.05)',
              }}
              ref={jokerModalRef}
            >
              {/* Handle — drag to dismiss */}
              <div
                onPointerDown={handleJokerDragDown}
                onPointerMove={handleJokerDragMove}
                onPointerUp={handleJokerDragUp}
                onPointerCancel={handleJokerDragCancel}
                style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px', cursor: 'grab', touchAction: 'none' }}
              >
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
              </div>
              {/* Header */}
              <div style={{
                padding: '8px 16px 12px',
                borderBottom: '1px solid rgba(255,215,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
              }}>
              {selectedJoker && !showPartnerSelect ? (
                <button onClick={() => setSelectedJoker(null)} style={{
                  background: 'none', border: 'none', color: '#FFD700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 700,
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                }}>
                  <ArrowLeft size={16} weight="bold" /> Retour
                </button>
              ) : showPartnerSelect ? (
                <button onClick={() => { setShowPartnerSelect(false); setSelectedPartners([]); }} style={{
                  background: 'none', border: 'none', color: '#FFD700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 700,
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                }}>
                  <ArrowLeft size={16} weight="bold" /> Retour
                </button>
              ) : (
                <h3 style={{
                  margin: 0, fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '1.1rem', color: '#FFD700',
                }}>
                  JOKER TIME
                </h3>
              )}
              <button onClick={() => { setShowJokerModal(false); setSelectedJoker(null); }} style={{
                background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px',
                padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Content */}
            {!selectedJoker && !showPartnerSelect && (
              <>
                {/* Tabs */}
                <div style={{
                  display: 'flex', padding: '8px 12px', gap: '6px', flexShrink: 0,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {[
                    { key: 'standup', label: 'Stand-Up', icon: <Microphone size={14} weight="bold" /> },
                    { key: 'scene', label: 'Théâtre', icon: <MaskHappy size={14} weight="bold" /> },
                    { key: 'collective', label: 'Collectif', icon: <UsersThree size={14} weight="bold" /> },
                  ].map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => setJokerTab(key)}
                      style={{
                        flex: 1, padding: '8px 6px', borderRadius: '10px',
                        border: jokerTab === key ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(255,255,255,0.06)',
                        background: jokerTab === key ? 'rgba(255,215,0,0.12)' : 'transparent',
                        color: jokerTab === key ? '#FFD700' : 'rgba(255,255,255,0.4)',
                        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      }}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>

                {/* Options — Full catalog with used/pro states */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(jokerTab === 'standup' ? STANDUP_SCRIPTS
                      : jokerTab === 'scene' ? SCENES.filter(s => s.playerCount <= activePCount)
                      : COLLECTIVE_GAMES
                    ).map((content) => {
                      const isUsed = usedJokerIds.has(content.id);
                      const isLocked = content.pro && !isPro;
                      const isDisabled = isUsed || isLocked;

                      return (
                        <motion.button
                          key={content.id}
                          whileTap={!isDisabled ? { scale: 0.97 } : {}}
                          onClick={() => !isDisabled && selectJokerContent(content, jokerTab)}
                          style={{
                            width: '100%', padding: '14px 16px', textAlign: 'left',
                            background: isUsed ? 'rgba(255,255,255,0.02)' : isLocked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${isUsed ? 'rgba(255,255,255,0.04)' : isLocked ? 'rgba(255,215,0,0.08)' : 'rgba(255,215,0,0.15)'}`,
                            borderRadius: '14px',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isUsed ? 0.35 : isLocked ? 0.5 : 1,
                            position: 'relative',
                          }}
                        >
                          {/* Used overlay */}
                          {isUsed && (
                            <div style={{
                              position: 'absolute', top: '50%', right: '14px', transform: 'translateY(-50%)',
                              fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
                              textTransform: 'uppercase', letterSpacing: '0.5px',
                            }}>
                              Déjà joué
                            </div>
                          )}
                          {/* Pro lock */}
                          {isLocked && (
                            <div style={{
                              position: 'absolute', top: '50%', right: '14px', transform: 'translateY(-50%)',
                              display: 'flex', alignItems: 'center', gap: '4px',
                              fontSize: '0.65rem', fontWeight: 700, color: '#FFD700',
                            }}>
                              <Lock size={12} weight="bold" /> PRO
                            </div>
                          )}
                          <div style={{ marginBottom: '6px', paddingRight: isDisabled ? '70px' : 0 }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: isUsed ? 'rgba(255,255,255,0.4)' : '#fff' }}>
                              {content.title}
                            </span>
                            {content.source && (
                              <div style={{ fontSize: '0.7rem', color: 'rgba(255,215,0,0.5)', fontStyle: 'italic', marginTop: '2px' }}>
                                {content.source}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
                              background: 'rgba(255,215,0,0.1)', color: '#FFD700',
                            }}>
                              {content.tone}
                            </span>
                            <span style={{
                              padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
                              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                            }}>
                              {content.duration}
                            </span>
                            {content.playerCount && content.playerCount > 1 && (
                              <span style={{
                                padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
                                background: `${ACCENT}15`, color: ACCENT,
                              }}>
                                {content.playerCount} joueurs
                              </span>
                            )}
                            {content.difficulty && (
                              <span style={{
                                padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700,
                                background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)',
                              }}>
                                {content.difficulty}
                              </span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Selected content preview */}
            {selectedJoker && !showPartnerSelect && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#FFD700' }}>
                  {selectedJoker.title}
                </h3>
                {selectedJoker.source && (
                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: 'rgba(255,215,0,0.6)', fontStyle: 'italic' }}>
                    {selectedJoker.source}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(255,215,0,0.1)', color: '#FFD700' }}>
                    {selectedJoker.tone}
                  </span>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                    {selectedJoker.duration}
                  </span>
                </div>

                {selectedJoker.stageDirections && (
                  <div style={{
                    padding: '10px 14px', marginBottom: '14px', borderRadius: '10px',
                    background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)',
                    fontSize: '0.8rem', color: 'rgba(255,215,0,0.8)', fontStyle: 'italic', lineHeight: 1.5,
                  }}>
                    {selectedJoker.stageDirections}
                  </div>
                )}

                {selectedJoker.setup && (
                  <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                    {selectedJoker.setup}
                  </p>
                )}

                {selectedJoker.script && (
                  selectedJoker.type === 'scene' && selectedJoker.roles ? (
                    <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                      <RenderSceneScript
                        script={selectedJoker.script}
                        roles={selectedJoker.roles}
                        selectedPlayers={null}
                        myUid={myUid}
                        players={players}
                      />
                    </div>
                  ) : (
                    <div style={{
                      padding: '14px', borderRadius: '12px',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)',
                      lineHeight: 1.7, whiteSpace: 'pre-wrap',
                      maxHeight: '40vh', overflowY: 'auto',
                    }}>
                      {selectedJoker.script}
                    </div>
                  )
                )}

                {selectedJoker.rules && (
                  <div style={{
                    padding: '14px', borderRadius: '12px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.7, whiteSpace: 'pre-wrap',
                  }}>
                    {selectedJoker.rules}
                  </div>
                )}

                {/* Launch button */}
                <div style={{ padding: '16px 0' }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={selectedJoker.type === 'scene' && selectedJoker.playerCount > 1 ? () => setShowPartnerSelect(true) : launchJoker}
                    style={{
                      width: '100%', padding: '16px',
                      background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                      border: 'none', borderRadius: '14px',
                      color: '#000', fontSize: '1rem', fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                      boxShadow: '0 4px 20px rgba(255,215,0,0.3)',
                    }}
                  >
                    <Play size={20} weight="fill" />
                    {selectedJoker.type === 'scene' && selectedJoker.playerCount > 1 ? 'Choisir les partenaires' : 'Lancer le Joker !'}
                  </motion.button>
                </div>
              </div>
            )}

            {/* Partner selection */}
            {showPartnerSelect && selectedJoker && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
                  Choisis {selectedJoker.playerCount - 1} partenaire{selectedJoker.playerCount > 2 ? 's' : ''}
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                  Ils recevront leur rôle sur leur téléphone
                </p>

                {/* Roles preview */}
                <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{
                    padding: '8px 12px', borderRadius: '8px',
                    background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)',
                    fontSize: '0.8rem', color: '#FFD700', fontWeight: 700,
                  }}>
                    Toi : {selectedJoker.roles?.[0]?.name || 'Role 1'}
                  </div>
                  {selectedJoker.roles?.slice(1).map((role, idx) => (
                    <div key={idx} style={{
                      padding: '8px 12px', borderRadius: '8px',
                      background: selectedPartners[idx] ? `${ACCENT}12` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedPartners[idx] ? `${ACCENT}30` : 'rgba(255,255,255,0.06)'}`,
                      fontSize: '0.8rem', color: selectedPartners[idx] ? ACCENT : 'rgba(255,255,255,0.4)', fontWeight: 700,
                    }}>
                      {selectedPartners[idx] ? players.find(p => p.uid === selectedPartners[idx])?.name : '?'} : {role.name}
                    </div>
                  ))}
                </div>

                {/* Player list for selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                  {players.filter(p => p.uid !== myUid).map((player) => {
                    const isSelected = selectedPartners.includes(player.uid);
                    return (
                      <motion.button
                        key={player.uid}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedPartners(prev => prev.filter(uid => uid !== player.uid));
                          } else if (selectedPartners.length < selectedJoker.playerCount - 1) {
                            setSelectedPartners(prev => [...prev, player.uid]);
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '12px 14px',
                          background: isSelected ? `${ACCENT}15` : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isSelected ? `${ACCENT}40` : 'rgba(255,255,255,0.06)'}`,
                          borderRadius: '12px', cursor: 'pointer', width: '100%', textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', flex: 1 }}>
                          {player.name}
                        </span>
                        {isSelected && <span style={{ color: ACCENT, fontWeight: 800, fontSize: '0.85rem' }}>✓</span>}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Launch button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={launchJoker}
                  disabled={selectedPartners.length < selectedJoker.playerCount - 1}
                  style={{
                    width: '100%', padding: '16px',
                    background: selectedPartners.length >= selectedJoker.playerCount - 1
                      ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'rgba(255,255,255,0.05)',
                    border: 'none', borderRadius: '14px',
                    color: selectedPartners.length >= selectedJoker.playerCount - 1 ? '#000' : 'rgba(255,255,255,0.3)',
                    fontSize: '1rem', fontWeight: 800,
                    cursor: selectedPartners.length >= selectedJoker.playerCount - 1 ? 'pointer' : 'not-allowed',
                    fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                  }}
                >
                  <Play size={20} weight="fill" style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                  Lancer le Joker !
                </motion.button>
              </div>
            )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* JOKER ACTIVE — Performance screen (for the performer) */}
      <AnimatePresence>
        {isJokerActive && isMyJoker && !currentVote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.95)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              paddingTop: 'max(env(safe-area-inset-top, 0px), var(--safe-area-top-fallback, 0px))',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Joker header */}
            <div style={{
              padding: '14px 16px', flexShrink: 0,
              borderBottom: '1px solid rgba(255,215,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🃏</span>
                <span style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '0.9rem', color: '#FFD700',
                }}>
                  TON JOKER
                </span>
              </div>
            </div>

            {/* Script content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#FFD700' }}>
                {currentJoker.contentTitle}
              </h3>

              {/* Find the content to display */}
              {(() => {
                const allContent = [...STANDUP_SCRIPTS, ...SCENES, ...COLLECTIVE_GAMES];
                const content = allContent.find(c => c.id === currentJoker.contentId);
                if (!content) return <p style={{ color: 'rgba(255,255,255,0.5)' }}>Contenu en cours...</p>;

                return (
                  <>
                    {content.source && (
                      <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: 'rgba(255,215,0,0.6)', fontStyle: 'italic' }}>
                        {content.source}
                      </p>
                    )}
                    {content.stageDirections && (
                      <div style={{
                        padding: '10px 14px', marginBottom: '14px', borderRadius: '10px',
                        background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)',
                        fontSize: '0.8rem', color: 'rgba(255,215,0,0.8)', fontStyle: 'italic', lineHeight: 1.5,
                      }}>
                        {content.stageDirections}
                      </div>
                    )}
                    {content.setup && (
                      <div style={{
                        padding: '10px 14px', marginBottom: '14px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 1.5,
                      }}>
                        {content.setup}
                      </div>
                    )}
                    {content.script && (
                      currentJoker.contentType === 'scene' && content.roles ? (
                        <RenderSceneScript
                          script={content.script}
                          roles={content.roles}
                          selectedPlayers={currentJoker.selectedPlayers}
                          myUid={myUid}
                          players={players}
                        />
                      ) : (
                        <div style={{
                          fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)',
                          lineHeight: 1.8, whiteSpace: 'pre-wrap',
                        }}>
                          {content.script}
                        </div>
                      )
                    )}
                    {content.rules && (
                      <div style={{
                        fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)',
                        lineHeight: 1.8, whiteSpace: 'pre-wrap',
                      }}>
                        {content.rules}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* End joker button */}
            <div style={{
              padding: '12px 16px 16px', flexShrink: 0,
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={endJoker}
                style={{
                  width: '100%', padding: '14px',
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '14px', color: '#fff', fontSize: '0.9rem', fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif",
                }}
              >
                Terminer le Joker
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* JOKER ACTIVE — Partner screen (scenes: shared script) */}
      <AnimatePresence>
        {isJokerActive && isMyPartnerInJoker && !isMyJoker && !currentVote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.95)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              paddingTop: 'max(env(safe-area-inset-top, 0px), var(--safe-area-top-fallback, 0px))',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div style={{
              padding: '14px 16px', flexShrink: 0,
              borderBottom: '1px solid rgba(255,215,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎭</span>
                <span style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '0.9rem', color: ACCENT,
                }}>
                  {myJokerRole?.role || 'TON RÔLE'}
                </span>
              </div>
              <div style={{
                padding: '4px 10px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                  Joker de {players.find(p => p.uid === currentJoker.playerId)?.name || '?'}
                </span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 800, color: '#FFD700' }}>
                {currentJoker.contentTitle}
              </h3>

              {/* Show shared script for scenes */}
              {(() => {
                const content = SCENES.find(c => c.id === currentJoker.contentId);
                if (!content) return null;

                return (
                  <>
                    {content.source && (
                      <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: 'rgba(255,215,0,0.6)', fontStyle: 'italic' }}>
                        {content.source}
                      </p>
                    )}
                    {content.setup && (
                      <div style={{
                        padding: '10px 14px', marginBottom: '14px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 1.5,
                      }}>
                        {content.setup}
                      </div>
                    )}
                    <RenderSceneScript
                      script={content.script}
                      roles={content.roles}
                      selectedPlayers={currentJoker.selectedPlayers}
                      myUid={myUid}
                      players={players}
                    />
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* JOKER ACTIVE — Spectator screen: COLLECTIVE = full rules, STANDUP/SCENE = banner */}
      <AnimatePresence>
        {isJokerActive && !isMyJoker && !isMyPartnerInJoker && !currentVote && (
          currentJoker.contentType === 'collective' ? (
            /* COLLECTIVE: Full-screen rules view — everyone participates */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, zIndex: 9998,
                background: 'rgba(0,0,0,0.95)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                paddingTop: 'max(env(safe-area-inset-top, 0px), var(--safe-area-top-fallback, 0px))',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
            >
              <div style={{
                padding: '14px 16px', flexShrink: 0,
                borderBottom: '1px solid rgba(255,215,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>👥</span>
                  <span style={{
                    fontFamily: "var(--font-title, 'Bungee'), cursive",
                    fontSize: '0.9rem', color: '#FFD700',
                  }}>
                    JEU COLLECTIF
                  </span>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    Joker de {players.find(p => p.uid === currentJoker.playerId)?.name || '?'}
                  </span>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 800, color: '#FFD700' }}>
                  {currentJoker.contentTitle}
                </h3>

                {(() => {
                  const content = COLLECTIVE_GAMES.find(c => c.id === currentJoker.contentId);
                  if (!content) return <p style={{ color: 'rgba(255,255,255,0.5)' }}>Chargement...</p>;

                  return (
                    <>
                      {content.setup && (
                        <div style={{
                          padding: '10px 14px', marginBottom: '14px', borderRadius: '10px',
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                          fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', lineHeight: 1.5,
                        }}>
                          {content.setup}
                        </div>
                      )}
                      {content.rules && (
                        <div style={{
                          fontSize: '0.9rem', color: 'rgba(255,255,255,0.9)',
                          lineHeight: 1.8, whiteSpace: 'pre-wrap',
                        }}>
                          {content.rules}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          ) : (
            /* STANDUP/SCENE: Top banner for spectators */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9997,
                paddingTop: 'max(env(safe-area-inset-top, 0px), var(--safe-area-top-fallback, 0px))',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
                padding: '16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              <motion.div
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255,215,0,0.15)',
                  border: '1px solid rgba(255,215,0,0.4)',
                  borderRadius: '16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
                  {currentJoker.contentType === 'standup' ? '🎤' : '🎭'}
                </div>
                <div style={{
                  fontFamily: "var(--font-title, 'Bungee'), cursive",
                  fontSize: '0.85rem', color: '#FFD700',
                }}>
                  {players.find(p => p.uid === currentJoker.playerId)?.name || '?'} joue son Joker
                </div>
                <div style={{
                  fontSize: '0.7rem', color: 'rgba(255,215,0,0.5)', marginTop: '4px',
                }}>
                  {currentJoker.contentType === 'standup' ? 'Stand-Up' : 'Théâtre'}
                </div>
              </motion.div>
            </motion.div>
          )
        )}
      </AnimatePresence>

    </>
  );
}
