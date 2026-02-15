'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/**
 * Modal Pre-Prompt ATT
 * Affiche un message explicatif AVANT le prompt système Apple
 * Conforme aux guidelines Apple (un seul bouton "Continuer")
 */
export default function ATTPromptModal({ isOpen, onContinue }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="att-prompt-backdrop">
        <motion.div
          className="att-prompt-modal"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Icon */}
          <div className="att-prompt-icon">
            <Sparkles size={32} />
          </div>

          {/* Title */}
          <h2 className="att-prompt-title">
            Améliore ton expérience
          </h2>

          {/* Message */}
          <p className="att-prompt-message">
            Nous utilisons des données pour te montrer du contenu personnalisé et garder Gigglz gratuit pour tous.
          </p>

          {/* Single Button (Apple requirement) */}
          <button
            className="att-prompt-button"
            onClick={onContinue}
          >
            Continuer
          </button>

          {/* Small disclaimer */}
          <p className="att-prompt-disclaimer">
            Un message système apparaîtra ensuite
          </p>
        </motion.div>

        <style jsx>{`
          .att-prompt-backdrop {
            position: fixed;
            inset: 0;
            z-index: 10000;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .att-prompt-modal {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 24px;
            padding: 32px 24px;
            max-width: 360px;
            width: 100%;
            text-align: center;
            box-shadow:
              0 20px 60px rgba(0, 0, 0, 0.5),
              0 0 40px rgba(139, 92, 246, 0.2);
          }

          .att-prompt-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 20px;
            border-radius: 16px;
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow:
              0 4px 0 #6d28d9,
              0 8px 24px rgba(139, 92, 246, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }

          .att-prompt-title {
            font-family: 'Bungee', cursive;
            font-size: 1.5rem;
            font-weight: 400;
            color: white;
            margin: 0 0 12px 0;
            text-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
          }

          .att-prompt-message {
            font-family: 'Inter', sans-serif;
            font-size: 0.9375rem;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.6;
            margin: 0 0 24px 0;
          }

          .att-prompt-button {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            color: white;
            border: none;
            border-radius: 14px;
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow:
              0 4px 0 #6d28d9,
              0 8px 24px rgba(139, 92, 246, 0.4),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }

          .att-prompt-button:active {
            transform: translateY(2px);
            box-shadow:
              0 2px 0 #6d28d9,
              0 4px 12px rgba(139, 92, 246, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }

          .att-prompt-disclaimer {
            font-family: 'Inter', sans-serif;
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.4);
            margin: 16px 0 0 0;
          }

          @media (max-width: 380px) {
            .att-prompt-modal {
              padding: 28px 20px;
            }

            .att-prompt-title {
              font-size: 1.25rem;
            }

            .att-prompt-message {
              font-size: 0.875rem;
            }
          }
        `}</style>
      </div>
    </AnimatePresence>
  );
}
