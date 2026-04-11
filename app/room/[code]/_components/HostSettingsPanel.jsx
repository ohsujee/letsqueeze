'use client';

import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { CaretRight, Lightning, UsersThree } from '@phosphor-icons/react';

const ACCENT = '#8b5cf6';

/**
 * HostSettingsPanel — Quiz selector + mode toggle + team count
 * Extracted from quiz lobby page for readability.
 */
export default function HostSettingsPanel({
  meta, quizSelection, hasSelection, selectedThemeNames, totalQuestions,
  onOpenQuizSelector, onModeToggle, onTeamCountChange,
}) {
  return (
    <LayoutGroup>
      <motion.div
        key="settings"
        className="quiz-settings-panel"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {/* Quiz selector row */}
        <motion.div
          className="quiz-selector-row"
          onClick={onOpenQuizSelector}
          whileTap={{ scale: 0.98 }}
        >
          <span className="quiz-selector-emoji">
            {quizSelection?.categoryEmoji || '🧠'}
          </span>
          <div className="quiz-selector-info">
            <div className="quiz-selector-name">
              {quizSelection?.categoryName || 'Choisis un quiz'}
            </div>
            {hasSelection && (
              <div className="quiz-selector-detail">
                {selectedThemeNames} &bull; {totalQuestions} questions
              </div>
            )}
          </div>
          <div className="quiz-selector-action">
            <span className="quiz-selector-action-label">
              {hasSelection ? 'Changer' : 'Choisir'}
            </span>
            <CaretRight size={14} weight="bold" color={ACCENT} />
          </div>
        </motion.div>

        {/* Divider */}
        <div className="quiz-settings-divider" />

        {/* Mode segmented control */}
        <div className="quiz-mode-control">
          {[
            { val: 'individuel', label: 'Solo', icon: <Lightning size={14} weight="bold" /> },
            { val: 'équipes', label: 'Équipes', icon: <UsersThree size={14} weight="bold" /> },
          ].map(({ val, label, icon }) => {
            const active = meta?.mode === val;
            return (
              <motion.button
                key={val}
                className={`quiz-mode-btn${active ? ' active' : ''}`}
                onClick={onModeToggle}
                whileTap={{ scale: 0.97 }}
              >
                {active && (
                  <motion.div
                    layoutId="mode-pill"
                    className="quiz-mode-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                {icon}
                {label}
              </motion.button>
            );
          })}
        </div>

        {/* Team count selector */}
        <AnimatePresence>
          {meta?.mode === 'équipes' && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="lobby-team-count-row">
                <span className="lobby-team-count-label">Nombre d'équipes</span>
                <div className="lobby-team-count-btns">
                  {[2, 3, 4].map(count => {
                    const active = (meta?.teamCount || 2) === count;
                    return (
                      <button
                        key={count}
                        className={`lobby-team-count-btn${active ? ' active' : ''}`}
                        onClick={() => onTeamCountChange(count)}
                      >
                        {count}
                        {active && (
                          <motion.div
                            layoutId="team-count-bar"
                            className="lobby-team-count-bar"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </LayoutGroup>
  );
}
