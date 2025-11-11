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
          gap: 8px;
          padding: 12px 20px;
          min-height: 44px;
          background: var(--gradient-primary);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
        }

        .qr-modal-btn:active {
          transform: translateY(0) scale(0.98);
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
          background: rgba(0, 0, 0, 0.75);
          z-index: 100;
          will-change: opacity, backdrop-filter;
          /* Backdrop filter sera animé par Framer Motion */
        }

        .qr-modal-content {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 400px;
          background: linear-gradient(135deg, rgba(26, 26, 26, 0.98), rgba(20, 20, 20, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.05),
            0 24px 64px rgba(0, 0, 0, 0.6),
            0 8px 24px rgba(0, 0, 0, 0.4);
          z-index: 101;
          overflow: hidden;
          will-change: transform, opacity;
          /* Enable GPU acceleration */
          transform: translate3d(-50%, -50%, 0);
        }

        /* Active state when modal is open */
        .qr-modal-btn-active {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9));
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
        }

        .qr-modal-btn-active:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 1), rgba(220, 38, 38, 1));
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
        }

        .qr-modal-body {
          padding: 32px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .qr-code-container {
          display: inline-block;
          padding: 20px;
          background: linear-gradient(135deg, #FFFFFF, #F8F9FA);
          border-radius: 20px;
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.05),
            0 8px 24px rgba(0, 0, 0, 0.15),
            0 4px 12px rgba(0, 0, 0, 0.1);
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
          /* Prevent image flickering during animation */
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .qr-modal-text {
          color: rgba(255, 255, 255, 0.85);
          font-size: 15px;
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
            padding: 24px 20px;
            gap: 20px;
          }

          .qr-modal-text {
            font-size: 14px;
          }
        }
      `}</style>
    </>
  );
}
