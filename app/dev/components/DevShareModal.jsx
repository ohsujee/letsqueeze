'use client';

/**
 * DevShareModal — Copie dev de ShareModal
 * Différences vs original :
 * - Icônes Phosphor au lieu de Lucide
 * - Bouton trigger neutre (blanc) au lieu de vert hardcodé
 */

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShareNetwork, X, Copy, Check } from '@phosphor-icons/react';

const DevShareModal = forwardRef(function DevShareModal({ roomCode, joinUrl }, ref) {
  const [isOpen, setIsOpen]   = useState(false);
  const [copied, setCopied]   = useState(false);
  const [mounted, setMounted] = useState(false);

  useImperativeHandle(ref, () => ({
    open:  () => setIsOpen(true),
    close: () => setIsOpen(false),
  }));

  useEffect(() => { setMounted(true); }, []);

  if (!roomCode || !joinUrl) return null;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur copie:', err);
    }
  };

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          <motion.div
            className="share-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            className="share-modal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400, mass: 0.8 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 150 || velocity.y > 500) setIsOpen(false);
            }}
          >
            <div className="modal-handle" />
            <h3 className="modal-title">Invite des joueurs</h3>
            <div className="qr-container">
              <div className="qr-wrapper">
                <img src={qrUrl} alt="QR Code" />
              </div>
            </div>
            <div className="share-info">
              <p className="share-url selectable">{joinUrl}</p>
              <p className="share-code selectable">{roomCode}</p>
            </div>
            <div className="share-actions">
              <button className="btn-copy" onClick={handleCopy}>
                {copied ? (
                  <><Check size={18} weight="bold" /> Copié !</>
                ) : (
                  <><Copy size={18} weight="bold" /> Copier le lien</>
                )}
              </button>
              <button className="btn-close" onClick={() => setIsOpen(false)}>
                <X size={18} weight="bold" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Bouton trigger — neutre, cohérent tous les jeux */}
      <button
        className="dev-share-trigger-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Partager"
      >
        <ShareNetwork size={20} weight="bold" />
      </button>

      {mounted && createPortal(modalContent, document.body)}

      <style jsx global>{`
        .dev-share-trigger-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.06);
          border: 1.5px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .dev-share-trigger-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.25);
          color: #fff;
          transform: translateY(-1px);
        }
        .dev-share-trigger-btn:active {
          transform: scale(0.95);
        }
      `}</style>
    </>
  );
});

export default DevShareModal;
