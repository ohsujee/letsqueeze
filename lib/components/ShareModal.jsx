"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, X, Copy, Check } from "lucide-react";

export default function ShareModal({ roomCode, joinUrl }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!roomCode || !joinUrl) return null;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erreur copie:", err);
    }
  };

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="share-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsOpen(false)}
          />

          {/* Bottom Sheet */}
          <motion.div
            className="share-modal"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 400,
              mass: 0.8,
            }}
          >
            {/* Handle */}
            <div className="modal-handle" />

            {/* Title */}
            <h3 className="modal-title">Inviter des joueurs</h3>

            {/* QR Code */}
            <div className="qr-container">
              <div className="qr-wrapper">
                <img src={qrUrl} alt="QR Code" />
              </div>
            </div>

            {/* Share Info */}
            <div className="share-info">
              <p className="share-url selectable">{joinUrl}</p>
              <p className="share-code selectable">{roomCode}</p>
            </div>

            {/* Actions */}
            <div className="share-actions">
              <button className="btn-copy" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check size={18} />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copier le lien
                  </>
                )}
              </button>
              <button className="btn-close" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Trigger Button */}
      <button
        className="share-trigger-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Partager"
      >
        <Share2 size={20} />
      </button>

      {/* Modal via Portal - always renders on top */}
      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}
