'use client';

/**
 * GuestWarningModal — Modal d'avertissement mode invité
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Mascot from './Mascot';

export default function GuestWarningModal({
  show, onClose,
  onGoogleSignIn, onAppleSignIn, onGuestMode,
  loadingGoogle, loadingApple, loadingGuest,
  isAndroid,
}) {
  const anyLoading = loadingGoogle || loadingApple || loadingGuest;

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              zIndex: 100,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              zIndex: 101,
              pointerEvents: 'none',
            }}
          >
            <motion.div
              style={{
                width: '100%',
                maxWidth: 360,
                background: '#14141e',
                borderRadius: 20,
                padding: '2rem 1.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                pointerEvents: 'auto',
                position: 'relative',
              }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <button
                onClick={onClose}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: 8,
                  padding: 8,
                  cursor: 'pointer',
                  color: 'rgba(255, 255, 255, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '1.25rem',
              }}>
                <Mascot emotion="warning" size={110} />

                <div>
                  <h2 style={{
                    fontFamily: "'Bungee', cursive",
                    fontSize: '1.25rem',
                    color: '#ffffff',
                    margin: '0 0 0.75rem 0',
                  }}>
                    Mode Invité
                  </h2>
                  <p style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                    Tu ne pourras pas créer de partie<br />
                    et ta progression sera perdue.
                  </p>
                </div>

                <div style={{ width: '100%', height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', width: '100%' }}>
                  <p style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.5)',
                    margin: '0 0 0.25rem 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    S'inscrire avec
                  </p>

                  <motion.button
                    onClick={() => { onClose(); onGoogleSignIn(); }}
                    disabled={anyLoading}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.625rem',
                      padding: '0.75rem 1rem',
                      background: '#ffffff',
                      color: '#1f1f1f',
                      border: 'none',
                      borderRadius: 10,
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </motion.button>

                  {!isAndroid && (
                    <motion.button
                      onClick={() => { onClose(); onAppleSignIn(); }}
                      disabled={anyLoading}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.625rem',
                        padding: '0.75rem 1rem',
                        background: '#000000',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: 10,
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      whileHover={{ scale: 1.02, borderColor: 'rgba(255, 255, 255, 0.4)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      Apple
                    </motion.button>
                  )}
                </div>

                <div style={{ width: '100%', height: 1, background: 'rgba(255, 255, 255, 0.1)' }} />

                <motion.button
                  onClick={() => { onClose(); onGuestMode(); }}
                  disabled={loadingGuest}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.5)',
                    border: 'none',
                    borderRadius: 10,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: loadingGuest ? 'wait' : 'pointer',
                  }}
                  whileHover={{ color: 'rgba(255, 255, 255, 0.8)' }}
                >
                  {loadingGuest ? 'Connexion...' : 'Continuer quand même'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
