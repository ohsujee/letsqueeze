'use client';

import { motion, LayoutGroup } from 'framer-motion';
import { Microphone, Keyboard, Clock } from '@phosphor-icons/react';

/**
 * MindLinkSettingsPanel — Host settings: mode (oral/écrit), timer, nb defenders
 */
export default function MindLinkSettingsPanel({
  mode, timerMinutes, nbDefenders, maxDefenders,
  onModeChange, onTimerChange, onSetCount,
}) {
  return (
    <LayoutGroup>
      <motion.div
        key="settings"
        className="ml-settings-panel"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {/* Mode selector */}
        <div className="ml-segment-control">
          {[
            { val: 'oral', label: 'Oral', icon: <Microphone size={14} weight="bold" /> },
            { val: 'ecrit', label: 'Écrit', icon: <Keyboard size={14} weight="bold" /> },
          ].map(({ val, label, icon }) => (
            <motion.button
              key={val}
              className={`ml-segment-btn${mode === val ? ' active' : ''}`}
              onClick={() => onModeChange(val)}
              whileTap={{ scale: 0.97 }}
            >
              {mode === val && (
                <motion.div className="ml-segment-pill" layoutId="mode-pill" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              )}
              {icon}
              {label}
            </motion.button>
          ))}
        </div>

        <div className="ml-settings-divider" />

        {/* Timer */}
        <div className="ml-settings-row">
          <div>
            <div className="ml-settings-label">
              <Clock size={13} weight="bold" color="#ec4899" /> Timer
            </div>
            <div className="ml-settings-sublabel">Temps pour trouver le mot</div>
          </div>
          <div className="ml-stepper">
            <button
              className={`ml-stepper-btn ${timerMinutes <= 2 ? 'disabled' : 'enabled'}`}
              onClick={() => onTimerChange(Math.max(2, timerMinutes - 1))}
              disabled={timerMinutes <= 2}
            >−</button>
            <div className="ml-stepper-value">
              <span className="ml-stepper-number">{timerMinutes}</span>
              <span className="ml-stepper-unit">min</span>
            </div>
            <button
              className={`ml-stepper-btn ${timerMinutes >= 20 ? 'disabled' : 'enabled'}`}
              onClick={() => onTimerChange(Math.min(20, timerMinutes + 1))}
              disabled={timerMinutes >= 20}
            >+</button>
          </div>
        </div>

        <div className="ml-settings-divider" />

        {/* Defenders count */}
        <div className="ml-settings-row" style={{ marginBottom: 0 }}>
          <div>
            <div className="ml-settings-label">Défenseurs</div>
            <div className="ml-settings-sublabel">Protègent le mot secret</div>
          </div>
          <div className="ml-stepper">
            <button
              className={`ml-stepper-btn ${nbDefenders <= 1 ? 'disabled' : 'enabled'}`}
              onClick={() => onSetCount(-1)}
              disabled={nbDefenders <= 1}
            >−</button>
            <div className="ml-stepper-value">
              <span className="ml-stepper-number">{nbDefenders}</span>
            </div>
            <button
              className={`ml-stepper-btn ${nbDefenders >= maxDefenders ? 'disabled' : 'enabled'}`}
              onClick={() => onSetCount(1)}
              disabled={nbDefenders >= maxDefenders}
            >+</button>
          </div>
        </div>
      </motion.div>
    </LayoutGroup>
  );
}
