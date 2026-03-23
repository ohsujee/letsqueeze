'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useBackHandler } from '@/lib/hooks/useBackHandler';

export default function ExitButton({
  onExit,
  confirmMessage = "Voulez-vous vraiment quitter ? Votre progression sera perdue.",
  exitLabel = "Quitter",
  variant = "default" // "default" | "minimal" | "header"
}) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  const closeConfirm = useCallback(() => setShowConfirm(false), []);
  useBackHandler(closeConfirm, showConfirm);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleExit = () => {
    if (onExit) {
      onExit();
    } else {
      router.push('/home');
    }
  };

  return (
    <>
      <button
        className={`exit-button exit-button-${variant}`}
        onClick={() => setShowConfirm(true)}
        aria-label="Quitter"
      >
        <X size={variant === "header" ? 20 : 24} strokeWidth={2.5} />
        {variant === "default" && <span className="exit-label">{exitLabel}</span>}
      </button>

      {showConfirm && mounted && createPortal(
        <div className="exit-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="exit-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="exit-modal-title">Quitter la partie ?</h2>
            <p className="exit-modal-message">{confirmMessage}</p>
            <div className="exit-modal-actions">
              <button
                className="exit-modal-btn"
                onClick={() => setShowConfirm(false)}
              >
                Annuler
              </button>
              <button
                className="exit-modal-btn exit-modal-btn-danger"
                onClick={handleExit}
              >
                Quitter
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
