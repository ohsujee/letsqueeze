'use client';

import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Clock, SpeakerHigh, PencilSimple } from '@phosphor-icons/react';

/**
 * ImposteurSettingsPanel — Host settings: rounds, imposteurs, Mr. White, clue mode, timer
 */
export default function ImposteurSettingsPanel({
  totalRounds, nbImposteurs, mrWhiteEnabled, clueMode, descriptionTimer,
  canEnableMrWhite, maxImposteurs,
  onTotalRoundsChange, onNbImposteursChange, onMrWhiteToggle, onClueModeChange, onTimerChange,
}) {
  return (
    <LayoutGroup>
      <motion.div
        key="settings"
        className="imp-settings-panel"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {/* Manches */}
        <div className="imp-settings-row">
          <div className="imp-settings-label">🎯 Manches</div>
          <div className="imp-pill-btns">
            {[1, 2, 3].map(val => (
              <motion.button
                key={val}
                className={`imp-pill-btn${totalRounds === val ? ' active' : ''}`}
                onClick={() => onTotalRoundsChange(val)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.92 }}
                style={{ width: '44px', padding: '7px 0 8px' }}
              >
                <span className="imp-pill-btn-text">{val}</span>
                {totalRounds === val && (
                  <motion.div className="imp-pill-bar" layoutId="rounds-bar" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="imp-settings-divider" />

        {/* Nombre d'imposteurs */}
        <div className="imp-settings-row">
          <div className="imp-settings-label">🕵️ Imposteurs</div>
          <div className="imp-stepper">
            <button
              className={`imp-stepper-btn ${nbImposteurs <= 1 ? 'disabled' : 'enabled'}`}
              onClick={() => onNbImposteursChange(Math.max(1, nbImposteurs - 1))}
              disabled={nbImposteurs <= 1}
            >−</button>
            <div className="imp-stepper-value">{nbImposteurs}</div>
            <button
              className={`imp-stepper-btn ${nbImposteurs >= maxImposteurs ? 'disabled' : 'enabled'}`}
              onClick={() => onNbImposteursChange(Math.min(maxImposteurs, nbImposteurs + 1))}
              disabled={nbImposteurs >= maxImposteurs}
            >+</button>
          </div>
        </div>

        <div className="imp-settings-divider" />

        {/* Mr. White */}
        <div className="imp-settings-row" style={{ opacity: canEnableMrWhite ? 1 : 0.4 }}>
          <div>
            <div className="imp-settings-label">👻 Mr. White</div>
            <div className="imp-settings-sublabel">
              {canEnableMrWhite ? 'Un joueur sans mot qui doit bluffer' : '5 joueurs minimum'}
            </div>
          </div>
          <motion.button
            className={`imp-toggle ${mrWhiteEnabled && canEnableMrWhite ? 'on' : 'off'}${!canEnableMrWhite ? ' disabled' : ''}`}
            onClick={canEnableMrWhite ? onMrWhiteToggle : undefined}
            whileTap={canEnableMrWhite ? { scale: 0.9 } : {}}
          >
            <motion.div
              className={`imp-toggle-knob ${mrWhiteEnabled && canEnableMrWhite ? 'on' : 'off'}`}
              animate={{ x: mrWhiteEnabled && canEnableMrWhite ? 20 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>

        <div className="imp-settings-divider" />

        {/* Mode indices */}
        <div style={{ marginBottom: '14px' }}>
          <div className="imp-settings-label" style={{ marginBottom: '10px' }}>💬 Mode indices</div>
          <div className="imp-segment-control">
            {[
              { val: 'oral', label: 'Oral', icon: <SpeakerHigh size={14} weight="bold" /> },
              { val: 'written', label: 'Écrit', icon: <PencilSimple size={14} weight="bold" /> },
            ].map(({ val, label, icon }) => (
              <motion.button
                key={val}
                className={`imp-segment-btn${clueMode === val ? ' active' : ''}`}
                onClick={() => onClueModeChange(val)}
                whileTap={{ scale: 0.97 }}
              >
                {clueMode === val && (
                  <motion.div className="imp-segment-pill" layoutId="clue-pill" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                {icon}
                {label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Timer (written mode only) */}
        <AnimatePresence>
          {clueMode === 'written' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="imp-settings-divider" />
              <div className="imp-settings-row" style={{ marginBottom: 0 }}>
                <div className="imp-settings-label">
                  <Clock size={13} weight="bold" color="#a3e635" /> Timer
                </div>
                <div className="imp-pill-btns">
                  {[30, 45, 60, 0].map(secs => {
                    const label = secs === 0 ? 'Off' : `${secs}s`;
                    return (
                      <motion.button
                        key={secs}
                        className={`imp-pill-btn${descriptionTimer === secs ? ' active' : ''}`}
                        onClick={() => onTimerChange(secs)}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.92 }}
                      >
                        <span className="imp-pill-btn-text small">{label}</span>
                        {descriptionTimer === secs && (
                          <motion.div className="imp-pill-bar" layoutId="timer-bar" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                        )}
                      </motion.button>
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
