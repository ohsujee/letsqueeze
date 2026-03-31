'use client';

import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { House, Globe, Clock } from '@phosphor-icons/react';

export default function LaRegleSettingsPanel({
  mode, timerMinutes, nbInvestigators, maxInvestigators,
  onModeChange, onTimerChange, onSetCount,
}) {
  return (
    <LayoutGroup>
      <motion.div
        key="settings" className="lr-settings-panel"
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      >
        {/* Mode selector */}
        <div className="lr-segment-control">
          {[
            { val: 'meme_piece', label: 'Présentiel', icon: <House size={14} weight="bold" /> },
            { val: 'a_distance', label: 'À distance', icon: <Globe size={14} weight="bold" /> },
          ].map(({ val, label, icon }) => (
            <motion.button key={val} className={`lr-segment-btn${mode === val ? ' active' : ''}`} onClick={() => onModeChange(val)} whileTap={{ scale: 0.97 }}>
              {mode === val && <motion.div className="lr-segment-pill" layoutId="mode-pill" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
              {icon} {label}
            </motion.button>
          ))}
        </div>

        <div className="lr-settings-divider" />

        {/* Timer */}
        <div className="lr-settings-row">
          <div className="lr-settings-label"><Clock size={13} weight="bold" color="#00e5ff" /> Timer</div>
          <div className="lr-pill-btns">
            {[3, 5, 7, 10].map(mins => (
              <motion.button key={mins} className={`lr-pill-btn${timerMinutes === mins ? ' active' : ''}`} onClick={() => onTimerChange(mins)} whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }}>
                <span className="lr-pill-btn-number">{mins}</span>
                <span className="lr-pill-btn-unit">min</span>
                {timerMinutes === mins && <motion.div className="lr-pill-bar" layoutId="timer-bar" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="lr-settings-divider" />

        {/* Investigators stepper */}
        <div className="lr-settings-row" style={{ marginBottom: 0 }}>
          <div>
            <div className="lr-settings-label">Enquêteurs</div>
            <div className="lr-settings-sublabel">Rôle assigné par l'hôte</div>
          </div>
          <div className="lr-stepper">
            <button className={`lr-stepper-btn ${nbInvestigators <= 1 ? 'disabled' : 'enabled'}`} onClick={() => onSetCount(-1)} disabled={nbInvestigators <= 1}>−</button>
            <span className="lr-stepper-value">{nbInvestigators}</span>
            <button className={`lr-stepper-btn ${nbInvestigators >= maxInvestigators ? 'disabled' : 'enabled'}`} onClick={() => onSetCount(1)} disabled={nbInvestigators >= maxInvestigators}>+</button>
          </div>
        </div>
      </motion.div>
    </LayoutGroup>
  );
}
