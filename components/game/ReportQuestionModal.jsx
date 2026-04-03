'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Warning, X } from '@phosphor-icons/react';
import { useBackHandler } from '@/lib/hooks/useBackHandler';

const REPORT_TYPES = [
  { id: 'wrong_answer',       label: 'La réponse est incorrecte' },
  { id: 'bad_wording',        label: 'La question est mal formulée / confuse' },
  { id: 'answer_in_question', label: 'La réponse apparaît dans la question' },
  { id: 'too_vague',          label: 'Question trop ambiguë / trop vague' },
  { id: 'autre',              label: 'Autre' },
];

export default function ReportQuestionModal({ isOpen, onClose, onSubmit, submitting }) {
  useBackHandler(onClose, isOpen);

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
            background: 'rgb(8, 8, 15, 0.92)',
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
              background: '#1a1a2e',
              borderRadius: 18,
              overflow: 'hidden',
              border: 'none',
              borderBottom: '4px solid #13132a',
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
              background: '#d97706',
              borderBottom: '4px solid #92400e',
              padding: '20px 24px 18px',
              textAlign: 'center',
            }}>
              {/* Close */}
              <button
                onClick={handleClose}
                style={{
                  position: 'absolute',
                  top: 10, right: 10,
                  width: 32, height: 32,
                  borderRadius: 8,
                  background: '#b45309',
                  border: 'none',
                  borderBottom: '2px solid #92400e',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={15} weight="bold" />
              </button>

              {/* Icon */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: 8,
              }}>
                <Warning size={30} weight="fill" color="white" />
              </div>

              {/* Title */}
              <h2 style={{
                fontFamily: "'Bungee', cursive",
                fontSize: '1rem',
                color: 'white',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
              }}>
                Signaler un problème
              </h2>
            </div>

            {/* ── Body ── */}
            <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>

              {REPORT_TYPES.map(type => {
                const isChecked = selected.includes(type.id);
                return (
                  <button
                    key={type.id}
                    onClick={() => toggle(type.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '10px 14px',
                      background: isChecked ? '#2d1f5e' : '#222240',
                      border: 'none',
                      borderBottom: isChecked ? '2px solid #1e1445' : '2px solid #1a1a35',
                      borderRadius: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: 'none',
                      background: isChecked ? '#8b5cf6' : '#3a3a58',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isChecked && (
                        <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                          <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: '0.85rem',
                      fontWeight: isChecked ? 700 : 500,
                      color: isChecked ? '#fff' : '#8a8aa0',
                    }}>
                      {type.label}
                    </span>
                  </button>
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
                        borderRadius: 10,
                        border: 'none',
                        borderBottom: '2px solid #1a1a35',
                        background: '#222240',
                        color: '#fff',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.85rem',
                        resize: 'none',
                        outline: 'none',
                        boxSizing: 'border-box',
                        lineHeight: 1.5,
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Boutons ── */}
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <button
                  onClick={handleClose}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: 'none',
                    borderBottom: '3px solid #2a2a45',
                    background: '#3a3a58',
                    color: '#fff',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: 'none',
                    borderBottom: canSubmit ? '3px solid #5b21b6' : '3px solid #1a1a35',
                    background: canSubmit ? '#7c3aed' : '#222240',
                    color: canSubmit ? '#fff' : '#4a4a65',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: canSubmit ? 'pointer' : 'not-allowed',
                  }}
                >
                  {submitting ? 'Envoi...' : 'Signaler'}
                </button>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
