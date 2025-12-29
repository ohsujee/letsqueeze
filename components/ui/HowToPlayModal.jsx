'use client';

/**
 * HowToPlayModal
 * Modal "Comment jouer" accessible depuis le header des rooms
 * Fixed: Removed styled-jsx with dynamic variables (caused infinite compilation)
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

  // Inline styles to avoid styled-jsx compilation issues
  const styles = {
    overlay: {
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    },
    content: {
      position: 'relative',
      width: '100%',
      maxWidth: '380px',
      background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(16, 16, 26, 0.99) 100%)',
      border: `1px solid ${game.accentColor}40`,
      borderRadius: '24px',
      padding: '28px 24px',
      boxShadow: `0 20px 50px rgba(0, 0, 0, 0.5), 0 0 60px ${game.glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
    },
    closeBtn: {
      position: 'absolute',
      top: '12px',
      right: '12px',
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      color: 'rgba(255, 255, 255, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    header: {
      textAlign: 'center',
      marginBottom: '24px',
    },
    iconBox: {
      width: '64px',
      height: '64px',
      margin: '0 auto 16px',
      borderRadius: '18px',
      background: `linear-gradient(135deg, ${game.accentColor}, ${game.accentColor}cc)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      boxShadow: `0 4px 20px ${game.glowColor}`,
    },
    title: {
      fontFamily: "'Bungee', cursive",
      fontSize: '1.5rem',
      color: 'white',
      margin: '0 0 6px 0',
      textTransform: 'uppercase',
      letterSpacing: '0.02em',
      textShadow: `0 0 20px ${game.glowColor}`,
    },
    subtitle: {
      fontFamily: "'Inter', sans-serif",
      fontSize: '0.9375rem',
      color: 'rgba(255, 255, 255, 0.6)',
      margin: 0,
    },
    rulesContainer: {
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
    },
    rulesTitle: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: '0.875rem',
      fontWeight: 700,
      color: game.accentColor,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      margin: '0 0 16px 0',
    },
    rulesList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    ruleItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontFamily: "'Inter', sans-serif",
      fontSize: '0.9375rem',
      color: 'rgba(255, 255, 255, 0.85)',
      lineHeight: 1.4,
    },
    ruleIcon: {
      flexShrink: 0,
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      background: `${game.accentColor}20`,
      border: `1px solid ${game.accentColor}30`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: game.accentColor,
    },
    btnGotIt: {
      width: '100%',
      padding: '16px',
      background: `linear-gradient(135deg, ${game.accentColor}, ${game.accentColor}cc)`,
      color: gameType === 'alibi' ? '#000' : '#fff',
      border: 'none',
      borderRadius: '14px',
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: '1rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: `0 4px 15px ${game.glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={styles.overlay}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            style={styles.content}
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Close button */}
            <button style={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>

            {/* Header */}
            <div style={styles.header}>
              <div style={styles.iconBox}>
                <GameIcon size={28} />
              </div>
              <h2 style={styles.title}>{game.title}</h2>
              <p style={styles.subtitle}>{game.subtitle}</p>
            </div>

            {/* Rules */}
            <div style={styles.rulesContainer}>
              <h3 style={styles.rulesTitle}>Comment jouer ?</h3>
              <ul style={styles.rulesList}>
                {game.rules.map((rule, index) => {
                  const RuleIcon = rule.icon;
                  return (
                    <motion.li
                      key={index}
                      style={styles.ruleItem}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                    >
                      <div style={styles.ruleIcon}>
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
              style={styles.btnGotIt}
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              C'est compris !
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
