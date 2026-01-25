'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import ConnectionLostBanner from '@/components/game/ConnectionLostBanner';
import HostDisconnectedBanner from '@/components/game/HostDisconnectedBanner';
import { HOST_GRACE_PERIOD_MS } from '@/lib/hooks/useHostDisconnect';

/**
 * Page de développement pour prévisualiser les états de connexion
 * URL: /dev/connection-states
 */
export default function ConnectionStatesDevPage() {
  // États simulés
  const [showConnectionLost, setShowConnectionLost] = useState(false);
  const [showHostDisconnected, setShowHostDisconnected] = useState(false);
  const [hostDisconnectedAt, setHostDisconnectedAt] = useState(null);
  const [showDisconnectAlert, setShowDisconnectAlert] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const simulateHostDisconnect = (secondsAgo = 0) => {
    setHostDisconnectedAt(Date.now() - (secondsAgo * 1000));
    setShowHostDisconnected(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      color: 'white',
      padding: '80px 20px 40px',
      overflowY: 'auto',
      overflowX: 'hidden'
    }}>
      {/* Banners simulés */}
      {showConnectionLost && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9995 }}>
          <div style={{
            padding: '12px 16px',
            paddingTop: 'calc(12px + env(safe-area-inset-top))',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.98), rgba(185, 28, 28, 0.98))',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <div style={{
              width: 40, height: 40,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
                <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
                <line x1="12" y1="20" x2="12.01" y2="20"></line>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Connexion perdue</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Touchez l'écran pour reconnecter</div>
            </div>
            <button
              onClick={() => setShowConnectionLost(false)}
              style={{
                marginLeft: 'auto',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {showHostDisconnected && hostDisconnectedAt && (
        <HostDisconnectedBanner
          isHostTemporarilyDisconnected={true}
          hostDisconnectedAt={hostDisconnectedAt}
        />
      )}

      {/* DisconnectAlert Modal (pour les joueurs) */}
      <AnimatePresence>
        {showDisconnectAlert && (
          <motion.div
            className="disconnect-alert-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{
                width: '100%',
                maxWidth: 340,
                background: 'rgba(20, 20, 30, 0.95)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 20,
                padding: '32px 24px',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(239, 68, 68, 0.2)'
              }}
            >
              <div style={{
                width: 80,
                height: 80,
                margin: '0 auto 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '2px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '50%',
                color: '#ef4444'
              }}>
                <WifiOff size={40} />
              </div>
              <h2 style={{
                fontFamily: "'Bungee', cursive",
                fontSize: '1.25rem',
                color: '#ef4444',
                margin: '0 0 12px 0',
                textTransform: 'uppercase'
              }}>Connexion perdue</h2>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.9375rem',
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: 1.5,
                margin: '0 0 24px 0'
              }}>
                Tu as été déconnecté de la partie. Appuie sur le bouton pour revenir.
              </p>
              <motion.button
                onClick={() => {
                  setIsReconnecting(true);
                  setTimeout(() => {
                    setIsReconnecting(false);
                    setShowDisconnectAlert(false);
                  }, 1500);
                }}
                disabled={isReconnecting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: 'none',
                  borderRadius: 12,
                  color: 'white',
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: isReconnecting ? 'wait' : 'pointer',
                  boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                  opacity: isReconnecting ? 0.7 : 1
                }}
              >
                <RefreshCw size={20} style={isReconnecting ? { animation: 'spin 1s linear infinite' } : {}} />
                <span>{isReconnecting ? 'Reconnexion...' : 'Revenir dans la partie'}</span>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{
          fontFamily: "'Bungee', cursive",
          fontSize: '1.5rem',
          marginBottom: 8
        }}>
          🔌 États de Connexion
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>
          Page de développement pour prévisualiser les banners de connexion
        </p>

        {/* Section 1: ConnectionLostBanner */}
        <section style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 16,
          padding: 20,
          marginBottom: 20
        }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 8, color: '#f87171' }}>
            🔴 ConnectionLostBanner
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
            Affiché à <strong>tout le monde</strong> quand la connexion Firebase est perdue.
            <br />Principalement utile pour l'hôte qui attend les réponses.
          </p>
          <button
            onClick={() => setShowConnectionLost(!showConnectionLost)}
            style={{
              background: showConnectionLost ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 10,
              padding: '12px 20px',
              color: '#f87171',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {showConnectionLost ? '✓ Masquer' : 'Afficher le banner'}
          </button>
        </section>

        {/* Section 2: HostDisconnectedBanner */}
        <section style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 16,
          padding: 20,
          marginBottom: 20
        }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 8, color: '#fbbf24' }}>
            🟠 HostDisconnectedBanner
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
            Affiché aux <strong>joueurs uniquement</strong> quand l'hôte est temporairement déconnecté.
            <br />Affiche un compte à rebours avant fermeture ({HOST_GRACE_PERIOD_MS / 1000}s = {HOST_GRACE_PERIOD_MS / 60000} min).
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button
              onClick={() => simulateHostDisconnect(0)}
              style={{
                background: 'rgba(251, 191, 36, 0.15)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                borderRadius: 10,
                padding: '12px 16px',
                color: '#fbbf24',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Juste déconnecté (2:00)
            </button>
            <button
              onClick={() => simulateHostDisconnect(60)}
              style={{
                background: 'rgba(251, 191, 36, 0.15)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                borderRadius: 10,
                padding: '12px 16px',
                color: '#fbbf24',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Déconnecté il y a 1 min (1:00)
            </button>
            <button
              onClick={() => simulateHostDisconnect(100)}
              style={{
                background: 'rgba(251, 191, 36, 0.15)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                borderRadius: 10,
                padding: '12px 16px',
                color: '#fbbf24',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Critique (0:20)
            </button>
            {showHostDisconnected && (
              <button
                onClick={() => setShowHostDisconnected(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Masquer
              </button>
            )}
          </div>
        </section>

        {/* Section 3: DisconnectAlert Modal */}
        <section style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 16,
          padding: 20,
          marginBottom: 20
        }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 8, color: '#22c55e' }}>
            🟢 DisconnectAlert (Modale joueur)
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
            Modale plein écran pour les <strong>joueurs</strong> quand ils sont marqués "disconnected".
            <br />Permet de se reconnecter en un clic.
          </p>
          <button
            onClick={() => setShowDisconnectAlert(true)}
            style={{
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              borderRadius: 10,
              padding: '12px 20px',
              color: '#22c55e',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Afficher la modale
          </button>
        </section>

        {/* Section 4: Infos */}
        <section style={{
          background: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: 16,
          padding: 20
        }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 12, color: '#a78bfa' }}>
            ℹ️ Comment ça marche
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
            <p style={{ marginBottom: 12 }}>
              <strong>Grace Period de l'hôte :</strong> {HOST_GRACE_PERIOD_MS / 1000} secondes ({HOST_GRACE_PERIOD_MS / 60000} minutes)
            </p>
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li style={{ marginBottom: 8 }}>L'hôte perd sa connexion (background, WiFi→5G, etc.)</li>
              <li style={{ marginBottom: 8 }}>Firebase écrit <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 4 }}>hostDisconnectedAt</code></li>
              <li style={{ marginBottom: 8 }}>Les joueurs voient le banner orange avec compte à rebours</li>
              <li style={{ marginBottom: 8 }}>L'hôte revient → timestamp effacé → banner disparaît</li>
              <li>Si l'hôte ne revient pas après {HOST_GRACE_PERIOD_MS / 60000} min → room fermée</li>
            </ol>
          </div>
        </section>

        {/* Lien retour */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <a
            href="/home"
            style={{
              color: 'rgba(255,255,255,0.5)',
              textDecoration: 'none',
              fontSize: '0.85rem'
            }}
          >
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}
