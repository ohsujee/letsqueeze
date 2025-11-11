'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export default function ExitButton({
  onExit,
  confirmMessage = "Voulez-vous vraiment quitter ? Votre progression sera perdue.",
  exitLabel = "Quitter",
  variant = "default" // "default" | "minimal"
}) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

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

      {showConfirm && (
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
        </div>
      )}

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

        .exit-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          animation: fadeIn 0.2s ease;
          padding: 20px;
        }

        .exit-modal {
          background: white;
          border-radius: 20px;
          padding: 32px;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          text-align: center;
        }

        .exit-modal-title {
          font-size: 24px;
          font-weight: 800;
          color: #1a202c;
          text-align: center;
          margin-bottom: 16px;
          margin-top: 0;
        }

        .exit-modal-message {
          font-size: 16px;
          color: #4a5568;
          text-align: center;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .exit-modal-actions {
          display: flex;
          gap: 12px;
        }

        .exit-modal-actions .btn {
          flex: 1;
          height: 48px;
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(71, 85, 105, 0.1) !important;
          border: 2px solid rgba(71, 85, 105, 0.3) !important;
          color: #1a202c !important;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .exit-modal-actions .btn:hover {
          background: rgba(71, 85, 105, 0.2) !important;
          border-color: rgba(71, 85, 105, 0.5) !important;
          transform: translateY(-2px);
        }

        .exit-modal-actions .btn-danger {
          background: linear-gradient(135deg, #EF4444, #DC2626) !important;
          border-color: #EF4444 !important;
          color: white !important;
        }

        .exit-modal-actions .btn-danger:hover {
          background: linear-gradient(135deg, #DC2626, #B91C1C) !important;
          border-color: #DC2626 !important;
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4) !important;
          transform: translateY(-2px);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
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

          .exit-modal {
            padding: 24px;
          }

          .exit-modal-title {
            font-size: 20px;
          }

          .exit-modal-message {
            font-size: 14px;
          }
        }

        /* Theme-specific overrides */
        :global([data-theme="quiz"]) .exit-modal,
        :global([data-theme="alibi"]) .exit-modal {
          background: white;
          color: #1a202c;
        }

        :global([data-theme="quiz"]) .exit-modal-title,
        :global([data-theme="alibi"]) .exit-modal-title {
          color: #1a202c;
        }

        :global([data-theme="quiz"]) .exit-modal-message,
        :global([data-theme="alibi"]) .exit-modal-message {
          color: #4a5568;
        }
      `}</style>
    </>
  );
}
