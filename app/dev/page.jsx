'use client';

import { useState } from 'react';
import { ForceUpdateModal } from '@/components/shared/ForceUpdateModal';
import { useToast } from '@/lib/hooks/useToast';
import DevMidnightModal from './components/DevMidnightModal';
import { DevToastProvider, useDevToast } from './components/DevToast';

const GAMES = [
  {
    id: 'laregle',
    name: 'La Règle',
    icon: '🔍',
    color: '#00e5ff',
    description: 'Trouve la règle secrète',
    lobbyPath: '/dev/laregle',
    gamePath: '/dev/laregle/game',
    endPath: '/dev/laregle/end',
    lobbyReady: true,
    gameReady: true,
    lobbyRoles: [
      { key: 'host',   label: 'Host' },
      { key: 'player', label: 'Joueur' },
    ],
    gameRoles: [
      { key: 'enqueteur', label: 'Enquêteur' },
      { key: 'civil',     label: 'Civil' },
    ],
  },
  {
    id: 'quiz',
    name: 'Quiz Buzzer',
    icon: '⚡',
    color: '#8b5cf6',
    description: 'Buzzer questions rapides',
    lobbyPath: '/dev/quiz',
    gamePath: '/dev/quiz/game',
    lobbyReady: false,
    gameReady: false,
    lobbyRoles: [
      { key: 'host',   label: 'Host' },
      { key: 'player', label: 'Joueur' },
    ],
    gameRoles: [
      { key: 'askeur', label: 'Askeur' },
      { key: 'joueur', label: 'Joueur' },
    ],
  },
  {
    id: 'deeztest',
    name: 'DeezTest',
    icon: '🎵',
    color: '#A238FF',
    description: 'Devine les musiques',
    lobbyPath: '/dev/deeztest',
    gamePath: '/dev/deeztest/game',
    lobbyReady: false,
    gameReady: false,
    lobbyRoles: [
      { key: 'host',   label: 'Host' },
      { key: 'player', label: 'Joueur' },
    ],
    gameRoles: [
      { key: 'askeur', label: 'Askeur' },
      { key: 'joueur', label: 'Joueur' },
    ],
  },
  {
    id: 'alibi',
    name: 'Alibi',
    icon: '🕵️',
    color: '#f59e0b',
    description: 'Suspects vs inspecteurs',
    lobbyPath: '/dev/alibi',
    gamePath: '/dev/alibi/game',
    lobbyReady: false,
    gameReady: false,
    lobbyRoles: [
      { key: 'host',   label: 'Host' },
      { key: 'player', label: 'Joueur' },
    ],
    gameRoles: [
      { key: 'inspecteur', label: 'Inspecteur' },
      { key: 'suspect',    label: 'Suspect' },
    ],
  },
  {
    id: 'mime',
    name: 'Mime',
    icon: '🎭',
    color: '#00ff66',
    description: 'Jeu local de mime',
    lobbyPath: '/dev/mime',
    gamePath: null,
    lobbyReady: false,
    gameReady: false,
    lobbyRoles: [{ key: 'player', label: 'Joueur' }],
    gameRoles: [],
  },
];

export default function DevIndex() {
  const [activeTab, setActiveTab] = useState('lobbies');

  return (
    <DevToastProvider>
    <div style={{
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      background: '#04060f',
      fontFamily: "'Space Grotesk', sans-serif",
    }}>
      {/* Header */}
      <div style={{ padding: '32px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '1.4rem', filter: 'drop-shadow(0 0 8px rgba(0,229,255,0.6))' }}>⚡</span>
          <h1 style={{
            fontFamily: 'Bungee, sans-serif',
            fontSize: '1.3rem',
            color: '#eef2ff',
            margin: 0,
            letterSpacing: '0.04em',
            textShadow: '0 0 24px rgba(0,229,255,0.2)',
          }}>GIGGLZ DEV STUDIO</h1>
        </div>
        <p style={{
          color: 'rgba(238,242,255,0.35)',
          fontSize: '0.8rem',
          margin: '0 0 24px',
          paddingLeft: '36px',
          letterSpacing: '0.02em',
        }}>
          Clique sur un rôle pour ouvrir dans un nouvel onglet
        </p>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '4px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(238,242,255,0.06)',
          borderRadius: '12px',
          marginBottom: '28px',
        }}>
          {[
            { id: 'lobbies', label: 'Lobbies' },
            { id: 'game',    label: 'Game' },
            { id: 'ui',      label: 'UI' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: '9px',
                border: 'none',
                background: activeTab === tab.id ? 'rgba(238,242,255,0.08)' : 'transparent',
                color: activeTab === tab.id ? '#eef2ff' : 'rgba(238,242,255,0.35)',
                fontFamily: 'Bungee, sans-serif',
                fontSize: '0.85rem',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 20px 40px' }}>
        {activeTab === 'ui' ? <UIPlayground /> : <GameList games={GAMES} tab={activeTab} />}
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid rgba(238,242,255,0.05)',
        fontSize: '0.7rem',
        color: 'rgba(238,242,255,0.2)',
        textAlign: 'center',
        letterSpacing: '0.04em',
      }}>
        DEV ONLY — Ne pas shipper en production
      </div>
    </div>
    </DevToastProvider>
  );
}

function UIPlayground() {
  const [showForceUpdate, setShowForceUpdate] = useState(false);
  const [showMidnight, setShowMidnight] = useState(false);
  const toast = useDevToast();

  const cardStyle = {
    padding: '16px',
    background: 'rgba(238,242,255,0.025)',
    border: '1px solid rgba(238,242,255,0.06)',
    borderRadius: '12px',
  };

  const sectionTitle = (text) => (
    <div style={{
      fontSize: '0.65rem',
      color: 'rgba(238,242,255,0.3)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      marginBottom: '12px',
      fontWeight: 700,
    }}>{text}</div>
  );

  const btnStyle = (color, filled = false) => ({
    padding: '8px 16px',
    background: filled ? color : 'transparent',
    color: filled ? '#04060f' : color,
    border: filled ? 'none' : `1px solid ${color}50`,
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    fontFamily: "'Space Grotesk', sans-serif",
    transition: 'all 0.15s ease',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Force Update Modal */}
      <div style={{ ...cardStyle, borderLeft: '3px solid #ef4444' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: 'Bungee, sans-serif',
              fontSize: '0.9rem',
              color: '#eef2ff',
              letterSpacing: '0.03em',
              marginBottom: '4px',
            }}>Force Update Modal</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(238,242,255,0.3)' }}>
              Modale bloquante quand une mise à jour est requise
            </div>
          </div>
          <button
            onClick={() => setShowForceUpdate(true)}
            style={btnStyle('#ef4444', true)}
          >
            Prévisualiser
          </button>
        </div>
      </div>

      {/* Midnight Modal */}
      <div style={{ ...cardStyle, borderLeft: '3px solid #f97316' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: 'Bungee, sans-serif',
              fontSize: '0.9rem',
              color: '#eef2ff',
              letterSpacing: '0.03em',
              marginBottom: '4px',
            }}>Midnight Modal</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(238,242,255,0.3)' }}>
              Modale affichée quand le mot du jour change à minuit (sémantique)
            </div>
          </div>
          <button
            onClick={() => setShowMidnight(true)}
            style={btnStyle('#f97316', true)}
          >
            Prévisualiser
          </button>
        </div>
      </div>

      {/* Toasts */}
      <div style={{ ...cardStyle, borderLeft: '3px solid #8b5cf6' }}>
        {sectionTitle('Toasts')}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => toast.success('Action réussie !')}
            style={btnStyle('#22c55e', true)}
          >
            Success
          </button>
          <button
            onClick={() => toast.error('Une erreur est survenue')}
            style={btnStyle('#ef4444', true)}
          >
            Error
          </button>
          <button
            onClick={() => toast.warning('Attention, connexion instable')}
            style={btnStyle('#f59e0b', true)}
          >
            Warning
          </button>
          <button
            onClick={() => toast.info('Nouvelle partie disponible')}
            style={btnStyle('#8b5cf6', true)}
          >
            Info
          </button>
        </div>
      </div>

      {/* Notifications Push (preview) */}
      <div style={{ ...cardStyle, borderLeft: '3px solid #06b6d4' }}>
        {sectionTitle('Notifications Push (aperçu)')}
        <div style={{ fontSize: '0.78rem', color: 'rgba(238,242,255,0.4)', lineHeight: 1.5 }}>
          Les notifications push se gèrent depuis le dashboard Punkrecords.<br />
          Ici tu peux prévisualiser le rendu des modales et toasts liés aux notifications.
        </div>
      </div>

      {/* Midnight Modal overlay */}
      <DevMidnightModal
        isOpen={showMidnight}
        onClose={() => setShowMidnight(false)}
      />

      {/* Force Update overlay */}
      {showForceUpdate && (
        <>
          <ForceUpdateModal />
          <button
            onClick={() => setShowForceUpdate(false)}
            style={{
              position: 'fixed',
              top: '16px',
              right: '16px',
              zIndex: 10000,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.1rem',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}

function GameList({ games, tab }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {games.map(game => {
        const isLobbyTab = tab === 'lobbies';
        const ready     = isLobbyTab ? game.lobbyReady : game.gameReady;
        const roles     = isLobbyTab ? game.lobbyRoles : game.gameRoles;
        const basePath  = isLobbyTab ? game.lobbyPath  : game.gamePath;
        const noPage    = !basePath || roles.length === 0;

        return (
          <div
            key={game.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '14px 16px',
              background: 'rgba(238,242,255,0.025)',
              border: '1px solid rgba(238,242,255,0.06)',
              borderLeft: `3px solid ${game.color}`,
              borderRadius: '12px',
              opacity: ready ? 1 : 0.4,
            }}
          >
            {/* Ligne principale : icon + nom + boutons rôles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{game.icon}</span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: 'Bungee, sans-serif',
                  fontSize: '0.9rem',
                  color: '#eef2ff',
                  letterSpacing: '0.03em',
                  marginBottom: '2px',
                }}>{game.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(238,242,255,0.3)' }}>
                  {game.description}
                </div>
              </div>

              {ready && !noPage ? (
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {roles.map((role, i) => (
                    <a
                      key={role.key}
                      href={`${basePath}?view=${role.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '7px 14px',
                        background: i === 0 ? game.color : 'transparent',
                        color: i === 0 ? '#04060f' : game.color,
                        border: i === 0 ? 'none' : `1px solid ${game.color}50`,
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textDecoration: 'none',
                        textTransform: 'uppercase',
                        fontFamily: "'Space Grotesk', sans-serif",
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {role.label}
                    </a>
                  ))}
                </div>
              ) : (
                <span style={{
                  fontSize: '0.65rem',
                  color: 'rgba(238,242,255,0.2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  flexShrink: 0,
                }}>
                  À venir
                </span>
              )}
            </div>

            {/* Ligne secondaire : lien écran de fin (toujours visible si endPath défini) */}
            {game.endPath && (
              <div style={{
                paddingTop: '8px',
                borderTop: '1px solid rgba(238,242,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(238,242,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Écran de fin
                </span>
                <a
                  href={game.endPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '5px 12px',
                    background: 'transparent',
                    color: game.color,
                    border: `1px solid ${game.color}40`,
                    borderRadius: '7px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  Ouvrir →
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
