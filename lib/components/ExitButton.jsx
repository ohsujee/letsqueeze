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
          top: 20px;
          right: 20px;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .exit-button.minimal {
          padding: 10px;
          border-radius: 50%;
          min-width: 44px;
          min-height: 44px;
        }

        .exit-button.header {
          position: relative;
          top: auto;
          right: auto;
          padding: 8px;
          border-radius: 10px;
          min-width: 40px;
          min-height: 40px;
          max-height: 40px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: none;
        }

        .exit-button.header:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
        }

        .exit-button:hover {
          background: rgba(239, 68, 68, 0.8);
          border-color: rgba(255, 255, 255, 0.4);
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
        }

        .exit-button:active {
          transform: scale(0.95);
        }

        .exit-label {
          font-size: 14px;
          letter-spacing: 0.02em;
        }

        /* Mobile adjustments */
        @media (max-width: 640px) {
          .exit-button {
            top: 12px;
            right: 12px;
            padding: 10px 12px;
          }

          .exit-label {
            display: none;
          }

          .exit-button.minimal {
            padding: 10px;
            min-width: 44px;
            min-height: 44px;
          }
        }
      `}</style>
    </>
  );
}
