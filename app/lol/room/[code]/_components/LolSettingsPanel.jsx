'use client';

import { motion, LayoutGroup } from 'framer-motion';
import { Clock, ShieldStar, Skull } from '@phosphor-icons/react';

const ACCENT = '#EF4444';

/**
 * LolSettingsPanel — Host settings: elimination mode (classique/impitoyable) + duration stepper
 */
export default function LolSettingsPanel({ eliminationMode, duration, onEliminationChange, onDurationChange }) {
  return (
    <LayoutGroup>
      <motion.div
        key="settings" className="lol-settings-panel"
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
      >
        {/* Elimination mode */}
        <div className="lol-segment-control">
          {[
            { val: 'classique', label: 'Classique', desc: '2 cartons jaunes = éliminé', icon: <ShieldStar size={14} weight="bold" /> },
            { val: 'severe', label: 'Impitoyable', desc: '1 seul carton = éliminé', icon: <Skull size={14} weight="bold" /> },
          ].map(({ val, label, desc, icon }) => {
            const active = eliminationMode === val;
            return (
              <motion.button key={val} className={`lol-segment-btn${active ? ' active' : ''}`} onClick={() => onEliminationChange(val)} whileTap={{ scale: 0.97 }}>
                {active && <motion.div className="lol-segment-pill" layoutId="elim-pill" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                <div className="lol-segment-btn-main">
                  {icon} {label}
                </div>
                <span className={`lol-segment-btn-desc${active ? ' active' : ''}`}>{desc}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="lol-settings-divider" />

        {/* Duration stepper */}
        <div className="lol-settings-row">
          <div className="lol-settings-label"><Clock size={13} weight="bold" color={ACCENT} /> Durée</div>
          <div className="lol-stepper">
            <button className={`lol-stepper-btn ${duration <= 5 ? 'disabled' : 'enabled'}`} onClick={() => onDurationChange(Math.max(5, duration - 5))} disabled={duration <= 5}>−</button>
            <div className="lol-stepper-value">
              <span className="lol-stepper-number">{duration}</span>
              <span className="lol-stepper-unit">min</span>
            </div>
            <button className={`lol-stepper-btn ${duration >= 60 ? 'disabled' : 'enabled'}`} onClick={() => onDurationChange(Math.min(60, duration + 5))} disabled={duration >= 60}>+</button>
          </div>
        </div>
      </motion.div>
    </LayoutGroup>
  );
}
