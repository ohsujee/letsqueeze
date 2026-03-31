/**
 * EliminationNotifModal — Notification d'élimination d'un joueur (La Règle)
 * Partagé entre play/page.jsx et investigate/page.jsx
 */

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import PlayerBanner from '@/components/game/PlayerBanner';

export default function EliminationNotifModal({ player }) {
  return (
    <AnimatePresence>
      {player && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(8, 8, 12, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '320px',
              background: 'linear-gradient(180deg, rgba(45, 20, 20, 0.98) 0%, rgba(28, 12, 12, 0.98) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '24px',
              padding: '32px 24px 24px',
              textAlign: 'center',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 80px rgba(239, 68, 68, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              style={{
                width: '72px', height: '72px',
                margin: '0 auto 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08))',
                border: '2px solid rgba(239,68,68,0.5)',
                borderRadius: '50%',
                boxShadow: '0 0 40px rgba(239,68,68,0.3), inset 0 0 20px rgba(239,68,68,0.1)',
              }}
            >
              <AlertTriangle size={36} color="#f87171" />
            </motion.div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>
                Joueur éliminé
              </span>
              <div style={{ width: '100%' }}>
                <PlayerBanner player={player} accentColor="#ef4444" accentDark="#dc2626" />
              </div>
              <span style={{ fontFamily: "var(--font-display, 'Space Grotesk'), sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                N'a pas suivi la règle
              </span>
            </div>
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 2.5, ease: 'linear' }}
              style={{
                position: 'absolute',
                bottom: 0, left: 0, right: 0,
                height: '4px',
                background: '#ef4444',
                transformOrigin: 'left center',
                boxShadow: '0 0 10px #ef4444',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
