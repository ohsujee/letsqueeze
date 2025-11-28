'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export default function ExitButton({
  onExit,
  confirmMessage = "Voulez-vous vraiment quitter ? Votre progression sera perdue.",
  exitLabel = "Quitter",
  variant = "default" // "default" | "minimal" | "header"
}) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Pour le portal - s'assurer qu'on est côté client
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
        className={`exit-button ${variant}`}
        onClick={() => setShowConfirm(true)}
        aria-label="Quitter"
      >
        <X size={24} strokeWidth={2.5} />
        {variant === "default" && <span className="exit-label">{exitLabel}</span>}
      </button>

      {/* Utiliser un Portal pour rendre le modal en dehors du contexte de stacking du header */}
      {showConfirm && mounted && createPortal(
        <div className="exit-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="exit-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="exit-modal-title">Quitter la partie ?</h2>
            <p className="exit-modal-message">{confirmMessage}</p>
            <div className="exit-modal-actions">
              <button
                className="btn"
                onClick={() => setShowConfirm(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-danger"
                onClick={handleExit}
              >
                Quitter
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Styles du bouton uniquement - les styles du modal sont dans globals.css */}
      <style jsx>{`
        .exit-button {
          position: fixed;
          top: var(--space-5);
          right: var(--space-5);
          z-index: var(--z-dropdown);
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: all var(--transition-base);
          box-shadow: var(--shadow-md);
        }

        .exit-button.minimal {
          padding: var(--space-3);
          border-radius: var(--radius-full);
          min-width: 44px;
          min-height: 44px;
        }

        .exit-button.header {
          position: relative;
          top: auto;
          right: auto;
          padding: var(--space-2);
          border-radius: var(--radius-sm);
          min-width: 40px;
          min-height: 40px;
          max-height: 40px;
          background: var(--state-hover);
          border: 1px solid var(--border-subtle);
          box-shadow: none;
        }

        .exit-button.header:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: var(--brand-red);
        }

        .exit-button:hover {
          background: var(--brand-red);
          border-color: var(--glass-border);
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
        }

        .exit-button:active {
          transform: scale(0.95);
        }

        .exit-label {
          font-size: var(--font-size-sm);
          letter-spacing: var(--letter-spacing-wide);
        }

        /* Mobile adjustments */
        @media (max-width: 640px) {
          .exit-button {
            top: var(--space-3);
            right: var(--space-3);
            padding: var(--space-3);
          }

          .exit-label {
            display: none;
          }

          .exit-button.minimal {
            padding: var(--space-3);
            min-width: 44px;
            min-height: 44px;
          }
        }
      `}</style>
    </>
  );
}
