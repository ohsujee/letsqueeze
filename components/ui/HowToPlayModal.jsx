'use client';

/**
 * HowToPlayModal
 * Modal "Comment jouer" accessible depuis le header des rooms
 * Suit le guide-style-ui.md
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Clock, CheckCircle, Target, UserSearch, Zap } from 'lucide-react';

const GAME_RULES = {
  quiz: {
    title: 'Quiz Buzzer',
    subtitle: 'Testez vos connaissances !',
    icon: Target,
    accentColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    rules: [
      { icon: Users, text: "2 a 10 joueurs" },
      { icon: Zap, text: "L'animateur lit les questions a voix haute" },
      { icon: Target, text: "Les joueurs buzzent pour repondre" },
      { icon: CheckCircle, text: "Bonne reponse = +1 point" },
      { icon: Clock, text: "Le joueur avec le plus de points gagne !" }
    ]
  },
  alibi: {
    title: 'Alibi',
    subtitle: 'Interrogatoire intense !',
    icon: UserSearch,
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    rules: [
      { icon: Users, text: "2 equipes : Inspecteurs vs Suspects" },
      { icon: Clock, text: "Phase preparation : 1m30 pour lire l'alibi" },
      { icon: Target, text: "Phase interrogatoire : 10 questions" },
      { icon: Zap, text: "30 secondes par reponse" },
      { icon: CheckCircle, text: "Les inspecteurs valident ou refusent" }
    ]
  }
};

export default function HowToPlayModal({
  isOpen,
  onClose,
  gameType = 'quiz'
}) {
  if (!isOpen) return null;

  const game = GAME_RULES[gameType] || GAME_RULES.quiz;
  const GameIcon = game.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Close button */}
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>

            {/* Header */}
            <div className="modal-header">
              <div className="modal-icon">
                <GameIcon size={28} />
              </div>
              <h2 className="modal-title">{game.title}</h2>
              <p className="modal-subtitle">{game.subtitle}</p>
            </div>

            {/* Rules */}
            <div className="rules-container">
              <h3 className="rules-title">Comment jouer ?</h3>
              <ul className="rules-list">
                {game.rules.map((rule, index) => {
                  const RuleIcon = rule.icon;
                  return (
                    <motion.li
                      key={index}
                      className="rule-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                    >
                      <div className="rule-icon">
                        <RuleIcon size={16} />
                      </div>
                      <span>{rule.text}</span>
                    </motion.li>
                  );
                })}
              </ul>
            </div>

            {/* Got it button */}
            <motion.button
              className="btn-got-it"
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              C'est compris !
            </motion.button>
          </motion.div>

          <style jsx>{`
            .modal-overlay {
              position: fixed;
              inset: 0;
              z-index: 1000;
              background: rgba(0, 0, 0, 0.85);
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }

            .modal-content {
              position: relative;
              width: 100%;
              max-width: 380px;
              background: linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(16, 16, 26, 0.99) 100%);
              border: 1px solid ${game.accentColor}40;
              border-radius: 24px;
              padding: 28px 24px;
              box-shadow:
                0 20px 50px rgba(0, 0, 0, 0.5),
                0 0 60px ${game.glowColor},
                inset 0 1px 0 rgba(255, 255, 255, 0.05);
            }

            .modal-close {
              position: absolute;
              top: 12px;
              right: 12px;
              width: 36px;
              height: 36px;
              border-radius: 10px;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: rgba(255, 255, 255, 0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .modal-close:hover {
              background: rgba(255, 255, 255, 0.1);
              color: white;
            }

            .modal-header {
              text-align: center;
              margin-bottom: 24px;
            }

            .modal-icon {
              width: 64px;
              height: 64px;
              margin: 0 auto 16px;
              border-radius: 18px;
              background: linear-gradient(135deg, ${game.accentColor}, ${game.accentColor}cc);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              box-shadow: 0 4px 20px ${game.glowColor};
            }

            .modal-title {
              font-family: 'Bungee', cursive;
              font-size: 1.5rem;
              color: white;
              margin: 0 0 6px 0;
              text-transform: uppercase;
              letter-spacing: 0.02em;
              text-shadow: 0 0 20px ${game.glowColor};
            }

            .modal-subtitle {
              font-family: 'Inter', sans-serif;
              font-size: 0.9375rem;
              color: rgba(255, 255, 255, 0.6);
              margin: 0;
            }

            .rules-container {
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 16px;
              padding: 20px;
              margin-bottom: 20px;
            }

            .rules-title {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 0.875rem;
              font-weight: 700;
              color: ${game.accentColor};
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin: 0 0 16px 0;
            }

            .rules-list {
              list-style: none;
              padding: 0;
              margin: 0;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .rule-item {
              display: flex;
              align-items: center;
              gap: 12px;
              font-family: 'Inter', sans-serif;
              font-size: 0.9375rem;
              color: rgba(255, 255, 255, 0.85);
              line-height: 1.4;
            }

            .rule-icon {
              flex-shrink: 0;
              width: 32px;
              height: 32px;
              border-radius: 8px;
              background: ${game.accentColor}20;
              border: 1px solid ${game.accentColor}30;
              display: flex;
              align-items: center;
              justify-content: center;
              color: ${game.accentColor};
            }

            .btn-got-it {
              width: 100%;
              padding: 16px;
              background: linear-gradient(135deg, ${game.accentColor}, ${game.accentColor}cc);
              color: ${gameType === 'alibi' ? '#000' : '#fff'};
              border: none;
              border-radius: 14px;
              font-family: 'Space Grotesk', sans-serif;
              font-size: 1rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.03em;
              cursor: pointer;
              transition: all 0.2s ease;
              box-shadow:
                0 4px 15px ${game.glowColor},
                inset 0 1px 0 rgba(255, 255, 255, 0.2);
            }

            .btn-got-it:hover {
              box-shadow:
                0 6px 20px ${game.glowColor},
                inset 0 1px 0 rgba(255, 255, 255, 0.3);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
