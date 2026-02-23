'use client';

/**
 * HeartsModal
 * S'affiche quand le joueur clique sur sa barre de cœurs ou tente de jouer sans cœurs.
 * Mode "info" (cœurs > 0) ou mode "bloquant" (0 cœur).
 *
 * TODO Phase 2 : brancher isWatchingAd, onWatchAd, onUpgrade avec useHearts
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X, Play } from 'lucide-react';

const MAX_HEARTS = 5;

function HeartSVG({ full, size = 28 }) {
  const h = Math.round(size * (22 / 24));
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 24 22"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <path
        d="M12 21C12 21 2 14 2 7.5C2 4.42 4.42 2 7.5 2C9.24 2 10.91 2.81 12 4.09C13.09 2.81 14.76 2 16.5 2C19.58 2 22 4.42 22 7.5C22 14 12 21 12 21Z"
        fill={full ? '#ff2d55' : 'rgba(255,255,255,0.15)'}
        stroke={full ? '#c41230' : 'rgba(255,255,255,0.25)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {full && (
        <path
          d="M8.5 7.5C8.5 7.5 9.5 6 11.5 6.5"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export default function HeartsModal({
  isOpen,
  onClose,
  heartsRemaining = MAX_HEARTS,
  isWatchingAd = false,
  canRecharge = true,
  onWatchAd,
  onUpgrade,
}) {
  if (!isOpen) return null;

  const isBlocked = heartsRemaining === 0;

  const headerGradient = isBlocked
    ? 'linear-gradient(135deg, #7a0a1e, #c41230)'
    : 'linear-gradient(135deg, #c41230, #ff2d55)';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            style={{
              width: '100%',
              maxWidth: '360px',
              background: 'linear-gradient(180deg, #191924 0%, #0f0f16 100%)',
              borderRadius: 20,
              overflow: 'hidden',
              border: '1.5px solid rgba(255,255,255,0.1)',
              /* Flat : ombre solide sans glow coloré */
              boxShadow: '0 8px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header coloré ── */}
            <div style={{
              position: 'relative',
              background: headerGradient,
              padding: '28px 24px 24px',
              textAlign: 'center',
            }}>
              {/* Reflet inset top */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 55%)',
                pointerEvents: 'none',
              }} />

              {/* Close */}
              <button
                onClick={onClose}
                style={{
                  position: 'absolute',
                  top: 12, right: 12,
                  width: 34, height: 34,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.3)',
                  border: 'none',
                  color: 'rgba(255,255,255,0.85)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>

              {/* Hearts */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
                {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                  <HeartSVG key={i} full={i < heartsRemaining} size={30} />
                ))}
              </div>

              {/* Title */}
              <h2 style={{
                fontFamily: "'Bungee', cursive",
                fontSize: '1.3rem',
                color: 'white',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}>
                {isBlocked
                  ? 'Plus de cœurs !'
                  : `${heartsRemaining} cœur${heartsRemaining !== 1 ? 's' : ''} restant${heartsRemaining !== 1 ? 's' : ''}`}
              </h2>
            </div>

            {/* ── Body ── */}
            <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Description */}
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.55)',
                margin: '0 0 4px',
                lineHeight: 1.55,
                textAlign: 'center',
              }}>
                {isBlocked
                  ? 'Regarde une courte vidéo pour recharger tes 5 cœurs gratuitement. Ou passe Pro pour des vies infinies et zéro pub.'
                  : 'Chaque partie utilise 1 cœur. Ils se rechargent automatiquement à minuit. Passe Pro pour jouer sans limite.'}
              </p>

              {/* ── Bouton vidéo (vert) — action immédiate ── */}
              {canRecharge && (
                <motion.button
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 9,
                    width: '100%',
                    padding: '14px 16px',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 12,
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: isWatchingAd ? 'wait' : 'pointer',
                    opacity: isWatchingAd ? 0.6 : 1,
                    boxShadow: '0 4px 0 #15803d',
                    overflow: 'visible',
                  }}
                  onClick={onWatchAd}
                  disabled={isWatchingAd}
                  whileHover={isWatchingAd ? {} : { y: -1, boxShadow: '0 5px 0 #15803d' }}
                  whileTap={isWatchingAd ? {} : { y: 3, boxShadow: '0 1px 0 #15803d' }}
                >
                  {/* Sticker PUB */}
                  {!isWatchingAd && (
                    <div style={{
                      position: 'absolute',
                      top: -10,
                      right: -4,
                      background: 'white',
                      color: '#15803d',
                      fontSize: '0.6rem',
                      fontWeight: 900,
                      padding: '3px 7px',
                      borderRadius: 5,
                      transform: 'rotate(8deg)',
                      letterSpacing: '0.1em',
                      fontFamily: "'Space Grotesk', sans-serif",
                      textTransform: 'uppercase',
                      pointerEvents: 'none',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.35)',
                    }}>
                      Pub
                    </div>
                  )}
                  <Play size={16} fill="white" strokeWidth={0} />
                  {isWatchingAd ? 'Chargement...' : 'Recharger mes cœurs'}
                </motion.button>
              )}

              {/* ── Bouton Pro (gold) — upgrade ── */}
              <motion.button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  width: '100%',
                  padding: '14px 16px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#1a0e00',
                  border: 'none',
                  borderRadius: 12,
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 0 #b45309',
                }}
                onClick={onUpgrade}
                whileHover={{ y: -1, boxShadow: '0 5px 0 #b45309' }}
                whileTap={{ y: 3, boxShadow: '0 1px 0 #b45309' }}
              >
                <Crown size={16} />
                Devenir Pro
              </motion.button>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
