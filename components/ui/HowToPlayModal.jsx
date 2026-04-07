'use client';

/**
 * HowToPlayModal - V2
 * Modal "Comment jouer" avec sections navigables
 * Accessible depuis: GameCard (?), LobbySettings (host), Lobby (players)
 */

import { useState, useEffect } from 'react';
import { useBackHandler } from '@/lib/hooks/useBackHandler';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CaretRight } from '@phosphor-icons/react';
import { GAMES_DATA } from '@/lib/config/howToPlayData';
import {
  IntroSection, RolesSection, StepsSection, TimelineSection,
  ScoringSection, PhasesSection, WordleColorsSection,
  TotalExampleSection, MindLinkExampleSection, VerdictInlineSection
} from './HowToPlaySections';
import './HowToPlayModal.css';

// ============================================
// MAIN MODAL COMPONENT
// ============================================

export default function HowToPlayModal({ isOpen, onClose, gameType = 'quiz', showDismiss = false, onDismissForever }) {
  const [activeSection, setActiveSection] = useState(0);
  const [dismissChecked, setDismissChecked] = useState(false);
  const game = GAMES_DATA[gameType] || GAMES_DATA.quiz;

  // Back button ferme la modale
  useBackHandler(onClose, isOpen);

  // Reset section + checkbox when modal opens or game changes
  useEffect(() => {
    if (isOpen) {
      setActiveSection(0);
      setDismissChecked(false);
    }
  }, [isOpen, gameType]);

  const handleClose = () => {
    if (dismissChecked && onDismissForever) {
      onDismissForever();
    } else {
      onClose();
    }
  };

  const renderSectionContent = (section) => {
    const { content } = section;
    switch (content.type) {
      case 'intro':
        return <IntroSection content={content} />;
      case 'roles':
      case 'modes':
        return <RolesSection content={content} />;
      case 'steps':
        return <StepsSection content={content} accentColor={game.accentColor} />;
      case 'timeline-simple':
        return <TimelineSection content={content} />;
      case 'scoring':
        return <ScoringSection content={content} />;
      case 'phases':
        return <PhasesSection content={content} />;
      case 'verdict-inline':
        return <VerdictInlineSection content={content} />;
      case 'wordle-colors':
        return <WordleColorsSection content={content} />;
      case 'total-example':
        return <TotalExampleSection content={content} />;
      case 'mindlink-example':
        return <MindLinkExampleSection content={content} />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && game && (
        <motion.div
          className="htp-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="htp-modal"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              '--accent': game.accentColor,
            }}
          >
            {/* Header */}
            <div className="htp-header">
              <button className="htp-close" onClick={onClose}>
                <X weight="bold" size={20} />
              </button>
              <div className="htp-title-group">
                <h2 className="htp-title">{game.title}</h2>
                <p className="htp-subtitle">{game.subtitle}</p>
              </div>
            </div>

            {/* Content */}
            <div className="htp-content">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="htp-section"
                >
                  <h3 className="htp-section-title">
                    {(() => {
                      const Icon = game.sections[activeSection].icon;
                      return <Icon size={22} weight="fill" />;
                    })()}
                    {game.sections[activeSection].title}
                  </h3>
                  {renderSectionContent(game.sections[activeSection])}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="htp-footer">
              <div className="htp-footer-actions">
                <button
                  className="htp-btn-prev"
                  onClick={() => setActiveSection(Math.max(0, activeSection - 1))}
                  disabled={activeSection === 0}
                >
                  Précédent
                </button>
                {activeSection < game.sections.length - 1 ? (
                  <button
                    className="htp-btn-next"
                    onClick={() => setActiveSection(activeSection + 1)}
                  >
                    Suivant
                    <CaretRight weight="bold" size={18} />
                  </button>
                ) : (
                  <button className="htp-btn-done" onClick={handleClose}>
                    Compris !
                  </button>
                )}
              </div>
              {showDismiss && onDismissForever && (
                <label className="htp-dismiss-check">
                  <input
                    type="checkbox"
                    checked={dismissChecked}
                    onChange={e => setDismissChecked(e.target.checked)}
                  />
                  <span>Ne plus afficher</span>
                </label>
              )}
            </div>
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
