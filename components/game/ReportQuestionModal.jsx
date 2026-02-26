'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Warning, X } from '@phosphor-icons/react';

const REPORT_TYPES = [
  { id: 'wrong_answer',       label: 'La réponse est incorrecte' },
  { id: 'bad_wording',        label: 'La question est mal formulée / confuse' },
  { id: 'answer_in_question', label: 'La réponse apparaît dans la question' },
  { id: 'too_vague',          label: 'Question trop ambiguë / trop vague' },
  { id: 'autre',              label: 'Autre' },
];

export default function ReportQuestionModal({ isOpen, onClose, onSubmit, submitting }) {
  const [selected, setSelected] = useState([]);
  const [customText, setCustomText] = useState('');

  function toggle(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function handleSubmit() {
    if (selected.length === 0 || submitting) return;
    onSubmit({ reportTypes: selected, customText: selected.includes('autre') ? customText : '' });
  }

  function handleClose() {
    setSelected([]);
    setCustomText('');
    onClose();
  }

  const canSubmit = selected.length > 0 && !submitting;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
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
          onClick={handleClose}
        >
          <motion.div
            style={{
              width: '100%',
              maxWidth: '360px',
              background: 'linear-gradient(180deg, #191924 0%, #0f0f16 100%)',
              borderRadius: 20,
              overflow: 'hidden',
              border: '1.5px solid rgba(255,255,255,0.1)',
              boxShadow: '0 8px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div style={{
              position: 'relative',
              background: 'linear-gradient(135deg, #b45309, #f59e0b)',
              padding: '22px 24px 20px',
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
                onClick={handleClose}
                style={{
                  position: 'absolute',
                  top: 12, right: 12,
                  width: 32, height: 32,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.25)',
                  border: 'none',
                  color: 'rgba(255,255,255,0.85)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={15} />
              </button>

              {/* Icon */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 10,
              }}>
                <Warning size={32} weight="fill" color="white" />
              </div>

              {/* Title */}
              <h2 style={{
                fontFamily: "'Bungee', cursive",
                fontSize: '1.15rem',
                color: 'white',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                textShadow: '0 2px 8px rgba(0,0,0,0.35)',
              }}>
                Signaler un problème
              </h2>
            </div>

            {/* ── Body ── */}
            <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>

              {REPORT_TYPES.map(type => {
                const isChecked = selected.includes(type.id);
                return (
                  <motion.button
                    key={type.id}
                    onClick={() => toggle(type.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '11px 14px',
                      background: isChecked
                        ? 'rgba(139,92,246,0.15)'
                        : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${isChecked ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Custom checkbox */}
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: `2px solid ${isChecked ? '#8b5cf6' : 'rgba(255,255,255,0.25)'}`,
                      background: isChecked ? '#8b5cf6' : 'transparent',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {isChecked && (
                        <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                          <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.875rem',
                      fontWeight: isChecked ? 600 : 400,
                      color: isChecked ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)',
                      transition: 'color 0.15s',
                    }}>
                      {type.label}
                    </span>
                  </motion.button>
                );
              })}

              {/* Champ texte libre si Autre */}
              <AnimatePresence>
                {selected.includes('autre') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <textarea
                      rows={3}
                      placeholder="Décris le problème..."
                      value={customText}
                      onChange={e => setCustomText(e.target.value)}
                      style={{
                        width: '100%',
                        marginTop: 4,
                        padding: '10px 14px',
                        borderRadius: 12,
                        border: '1.5px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.9)',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        resize: 'none',
                        outline: 'none',
                        boxSizing: 'border-box',
                        lineHeight: 1.5,
                      }}
                      onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Boutons ── */}
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <motion.button
                  onClick={handleClose}
                  style={{
                    flex: 1,
                    padding: '13px 16px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.7)',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 3px 0 rgba(0,0,0,0.3)',
                  }}
                  whileHover={{ y: -1, boxShadow: '0 4px 0 rgba(0,0,0,0.3)' }}
                  whileTap={{ y: 2, boxShadow: '0 1px 0 rgba(0,0,0,0.3)' }}
                  disabled={submitting}
                >
                  Annuler
                </motion.button>

                <motion.button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  style={{
                    flex: 1,
                    padding: '13px 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: canSubmit
                      ? 'linear-gradient(135deg, #7c3aed, #8b5cf6)'
                      : 'rgba(255,255,255,0.08)',
                    color: canSubmit ? 'white' : 'rgba(255,255,255,0.3)',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                    boxShadow: canSubmit ? '0 4px 0 #5b21b6' : '0 3px 0 rgba(0,0,0,0.2)',
                    transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
                  }}
                  whileHover={canSubmit ? { y: -1, boxShadow: '0 5px 0 #5b21b6' } : {}}
                  whileTap={canSubmit ? { y: 3, boxShadow: '0 1px 0 #5b21b6' } : {}}
                >
                  {submitting ? 'Envoi...' : 'Signaler'}
                </motion.button>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
