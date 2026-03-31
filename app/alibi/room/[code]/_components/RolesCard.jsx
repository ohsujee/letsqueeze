'use client';

/**
 * RolesCard — Carte de gestion des rôles (host view, mode Game Master)
 */

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

export default function RolesCard({ inspectors, suspects, unassigned, players, handleAutoAssign, myUid }) {
  const [expandedRole, setExpandedRole] = useState(null);

  return (
              <div className="alibi-lobby-card alibi-roles-card">
                {/* Header with Quick Actions */}
                <div className="roles-header">
                  <span className="roles-label">Rôles</span>
                  <div className="roles-actions">
                    <motion.button
                      className="action-chip alibi-accent"
                      onClick={handleAutoAssign}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Répartir automatiquement"
                    >
                      <Shuffle size={14} />
                      Auto
                    </motion.button>
                    <motion.button
                      className="action-chip danger"
                      onClick={handleResetTeams}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="Réinitialiser"
                    >
                      <RotateCcw size={14} />
                    </motion.button>
                  </div>
                </div>

                {/* Roles Grid - 2 columns */}
                <div className="alibi-roles-grid">
                  {/* Inspectors */}
                  <motion.div
                    className={`alibi-role-card inspectors ${expandedRole === 'inspectors' ? 'expanded' : ''}`}
                    onClick={() => setExpandedRole(expandedRole === 'inspectors' ? null : 'inspectors')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="role-color-bar inspectors" />
                    <div className="role-info">
                      <span className="role-icon">🕵️</span>
                      <span className="role-name">Inspecteurs</span>
                      <span className="role-count">{inspectors.length}</span>
                    </div>
                    <div className="role-players-preview">
                      {inspectors.length === 0 ? (
                        <span className={`no-players ${unassigned.length > 0 ? 'add-hint' : ''}`}>
                          {unassigned.length > 0 ? '+ Ajouter' : 'Vide'}
                        </span>
                      ) : (
                        <>
                          {inspectors.slice(0, 3).map((player) => (
                            <span key={player.uid} className="player-name-chip inspectors">
                              {player.name?.length > 10 ? player.name.slice(0, 10) + '…' : player.name}
                            </span>
                          ))}
                          {inspectors.length > 3 && (
                            <span className="player-name-chip more">+{inspectors.length - 3}</span>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>

                  {/* Suspects */}
                  <motion.div
                    className={`alibi-role-card suspects ${expandedRole === 'suspects' ? 'expanded' : ''}`}
                    onClick={() => setExpandedRole(expandedRole === 'suspects' ? null : 'suspects')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="role-color-bar suspects" />
                    <div className="role-info">
                      <span className="role-icon">🎭</span>
                      <span className="role-name">Suspects</span>
                      <span className="role-count">{suspects.length}</span>
                    </div>
                    <div className="role-players-preview">
                      {suspects.length === 0 ? (
                        <span className={`no-players ${unassigned.length > 0 ? 'add-hint' : ''}`}>
                          {unassigned.length > 0 ? '+ Ajouter' : 'Vide'}
                        </span>
                      ) : (
                        <>
                          {suspects.slice(0, 3).map((player) => (
                            <span key={player.uid} className="player-name-chip suspects">
                              {player.name?.length > 10 ? player.name.slice(0, 10) + '…' : player.name}
                            </span>
                          ))}
                          {suspects.length > 3 && (
                            <span className="player-name-chip more">+{suspects.length - 3}</span>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Expanded Role Detail Modal */}
                <AnimatePresence>
                  {expandedRole && (
                    <motion.div
                      className="role-detail-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setExpandedRole(null)}
                    >
                      <motion.div
                        className={`role-detail-card ${expandedRole}`}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="detail-header">
                          <span className="detail-icon">
                            {expandedRole === 'inspectors' ? '🕵️' : '🎭'}
                          </span>
                          <h4 className="detail-title">
                            {expandedRole === 'inspectors' ? 'Inspecteurs' : 'Suspects'}
                          </h4>
                          <button className="detail-close" onClick={() => setExpandedRole(null)}>
                            <X size={18} />
                          </button>
                        </div>

                        {/* Players in this role */}
                        <div className="detail-players">
                          {(expandedRole === 'inspectors' ? inspectors : suspects).map(player => (
                            <div key={player.uid} className={`detail-player ${expandedRole}`}>
                              <div className={`player-dot ${expandedRole}`}>
                                {player.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <span className="player-name">{player.name}</span>
                              <button
                                className="remove-player-btn"
                                onClick={() => handleAssignTeam(player.uid, null)}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          {(expandedRole === 'inspectors' ? inspectors : suspects).length === 0 && (
                            <p className="empty-role">Aucun joueur dans ce rôle</p>
                          )}
                        </div>

                        {/* Add Player from unassigned */}
                        {unassigned.length > 0 && (
                          <div className="detail-add">
                            <span className="add-label">
                              <UserPlus size={14} /> Ajouter
                            </span>
                            <div className="add-chips">
                              {unassigned.map(p => (
                                <button
                                  key={p.uid}
                                  className={`add-player-chip ${expandedRole}`}
                                  onClick={() => handleAssignTeam(p.uid, expandedRole)}
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Unassigned Players Row */}
                {unassigned.length > 0 && !expandedRole && (
                  <div className="unassigned-row alibi">
                    <span className="unassigned-label">Sans rôle</span>
                    <div className="unassigned-chips">
                      {unassigned.slice(0, 4).map(p => (
                        <span key={p.uid} className="unassigned-chip">
                          {p.name?.slice(0, 8)}{p.name?.length > 8 ? '…' : ''}
                        </span>
                      ))}
                      {unassigned.length > 4 && (
                        <span className="unassigned-chip more">+{unassigned.length - 4}</span>
                      )}
                    </div>
                  </div>
                )}

              </div>

  );
}
