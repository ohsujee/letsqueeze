"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, X, ChevronDown } from "lucide-react";

export default function QrModal({ text, buttonText = "Afficher QR Code", closeText = "Fermer le QR Code", className = "" }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!text) return null;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;

  return (
    <>
      {/* Toggle Button */}
      <button
        className={`qr-modal-btn ${isOpen ? 'qr-modal-btn-active' : ''} ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <>
            <ChevronDown size={20} />
            <span>{closeText}</span>
          </>
        ) : (
          <>
            <QrCode size={20} />
            <span>{buttonText}</span>
          </>
        )}
      </button>

      {/* Modal */}
      <AnimatePresence mode="wait">
        {isOpen && (
          <>
            {/* Backdrop with smooth blur */}
            <motion.div
              className="qr-modal-backdrop"
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{
                opacity: 1,
                backdropFilter: "blur(8px)",
                transition: {
                  duration: 0.3,
                  ease: [0.32, 0.72, 0, 1] // Custom easing curve
                }
              }}
              exit={{
                opacity: 0,
                backdropFilter: "blur(0px)",
                transition: {
                  duration: 0.25,
                  ease: [0.32, 0.72, 0, 1]
                }
              }}
              onClick={() => setIsOpen(false)}
            />

            {/* Modal Content with smooth spring */}
            <motion.div
              className="qr-modal-content"
              initial={{
                opacity: 0,
                scale: 0.92,
                y: 30
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: {
                  type: "spring",
                  damping: 30,
                  stiffness: 400,
                  mass: 0.8,
                  delay: 0.05 // Slight delay after backdrop
                }
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                y: 20,
                transition: {
                  duration: 0.2,
                  ease: [0.32, 0.72, 0, 1]
                }
              }}
            >
              <motion.div
                className="qr-modal-body"
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { delay: 0.15, duration: 0.3 }
                }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <div className="qr-code-container">
                  <img
                    src={qrUrl}
                    alt="QR Code"
                    className="qr-code-image"
                  />
                </div>
                <p className="qr-modal-text">
                  Scannez ce QR code avec votre téléphone pour rejoindre la partie
                </p>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style jsx>{`
        .qr-modal-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.5rem;
          min-height: 48px;
          background: linear-gradient(135deg, var(--quiz-primary, #8b5cf6), #7c3aed);
          color: white;
          border: none;
          border-radius: 12px;
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-weight: 600;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow:
            0 4px 15px rgba(139, 92, 246, 0.4),
            0 0 30px rgba(139, 92, 246, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          position: relative;
          overflow: hidden;
        }

        .qr-modal-btn::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }

        .qr-modal-btn:hover::before {
          width: 300px;
          height: 300px;
        }

        .qr-modal-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow:
            0 6px 20px rgba(139, 92, 246, 0.5),
            0 0 40px rgba(139, 92, 246, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .qr-modal-btn:active {
          transform: translateY(1px) scale(0.98);
          transition: all 0.1s ease;
        }

        .qr-modal-btn > * {
          position: relative;
          z-index: 1;
        }

        .qr-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          z-index: 100;
          will-change: opacity, backdrop-filter;
        }

        .qr-modal-content {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 400px;
          background: rgba(20, 20, 30, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-radius: 20px;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.05),
            0 24px 64px rgba(0, 0, 0, 0.6),
            0 0 60px rgba(139, 92, 246, 0.15);
          z-index: 101;
          overflow: hidden;
          will-change: transform, opacity;
          transform: translate3d(-50%, -50%, 0);
        }

        /* Active state when modal is open */
        .qr-modal-btn-active {
          background: linear-gradient(135deg, var(--danger, #ef4444), #dc2626);
          box-shadow:
            0 4px 15px rgba(239, 68, 68, 0.4),
            0 0 30px rgba(239, 68, 68, 0.2);
        }

        .qr-modal-btn-active:hover {
          box-shadow:
            0 6px 20px rgba(239, 68, 68, 0.5),
            0 0 40px rgba(239, 68, 68, 0.3);
        }

        .qr-modal-body {
          padding: 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .qr-code-container {
          display: inline-block;
          padding: 1.25rem;
          background: linear-gradient(135deg, #FFFFFF, #F8F9FA);
          border-radius: 16px;
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.05),
            0 8px 24px rgba(0, 0, 0, 0.15),
            0 0 40px rgba(139, 92, 246, 0.1);
          will-change: transform;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .qr-code-container:hover {
          transform: scale(1.02);
        }

        .qr-code-image {
          display: block;
          width: 256px;
          height: 256px;
          border-radius: 12px;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .qr-modal-text {
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          font-family: var(--font-body, 'Inter'), sans-serif;
          font-size: 0.9375rem;
          line-height: 1.6;
          margin: 0;
          max-width: 320px;
        }

        @media (max-width: 480px) {
          .qr-modal-content {
            width: 95%;
          }

          .qr-code-image {
            width: 220px;
            height: 220px;
          }

          .qr-modal-body {
            padding: 1.5rem 1.25rem;
            gap: 1.25rem;
          }

          .qr-modal-text {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </>
  );
}
