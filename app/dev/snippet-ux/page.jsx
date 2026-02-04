'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Zap, Clock, Timer, Disc, ChevronRight, Volume2 } from 'lucide-react';

const SNIPPET_LEVELS = [
  { duration: 1500, label: "1.5s", start: 200, floor: 150 },
  { duration: 3000, label: "3s", start: 150, floor: 100 },
  { duration: 10000, label: "10s", start: 100, floor: 75 },
  { duration: null, label: "25s", start: 50, floor: 25 }
];

const DEEZER_PURPLE = '#A238FF';
const DEEZER_PINK = '#FF0092';

// ============================================
// OPTION A: Play Button First
// ============================================
function OptionA() {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [unlockedLevel, setUnlockedLevel] = useState(0);

  const handleFirstPlay = () => {
    setHasStarted(true);
    setCurrentLevel(0);
  };

  const handlePlayLevel = (idx) => {
    setCurrentLevel(idx);
    if (idx >= unlockedLevel) {
      setTimeout(() => setUnlockedLevel(Math.min(idx + 1, 3)), 1000);
    }
  };

  const reset = () => {
    setHasStarted(false);
    setCurrentLevel(null);
    setUnlockedLevel(0);
  };

  return (
    <div className="option-container">
      <h3>Option A : "Play Button First"</h3>
      <p className="option-desc">Un gros bouton PLAY pour commencer, les paliers apparaissent après.</p>

      <div className="demo-area">
        <AnimatePresence mode="wait">
          {!hasStarted ? (
            <motion.button
              key="big-play"
              className="big-play-button"
              onClick={handleFirstPlay}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="big-play-icon">
                <Play size={32} fill="white" />
              </div>
              <div className="big-play-info">
                <span className="big-play-label">JOUER</span>
                <span className="big-play-sub">1.5s • 200 pts</span>
              </div>
            </motion.button>
          ) : (
            <motion.div
              key="levels"
              className="levels-row"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {SNIPPET_LEVELS.map((level, idx) => {
                const isLocked = idx > unlockedLevel;
                const isCurrent = currentLevel === idx;

                return (
                  <motion.button
                    key={idx}
                    className={`level-btn ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => !isLocked && handlePlayLevel(idx)}
                    disabled={isLocked}
                    whileHover={!isLocked ? { scale: 1.05 } : {}}
                    whileTap={!isLocked ? { scale: 0.95 } : {}}
                  >
                    {!isLocked && <Play size={14} fill="currentColor" className="level-play-icon" />}
                    <span className="level-duration">{level.label}</span>
                    <span className="level-points">+{level.start}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
        <button className="reset-btn" onClick={reset}>Reset démo</button>
      </div>
    </div>
  );
}

// ============================================
// OPTION B: Indicateurs Play explicites
// ============================================
function OptionB() {
  const [currentLevel, setCurrentLevel] = useState(null);
  const [unlockedLevel, setUnlockedLevel] = useState(0);

  const handlePlayLevel = (idx) => {
    setCurrentLevel(idx);
    if (idx >= unlockedLevel) {
      setTimeout(() => setUnlockedLevel(Math.min(idx + 1, 3)), 1000);
    }
  };

  const reset = () => {
    setCurrentLevel(null);
    setUnlockedLevel(0);
  };

  const isFirstTime = currentLevel === null;

  return (
    <div className="option-container">
      <h3>Option B : "Indicateurs Play explicites"</h3>
      <p className="option-desc">Grille actuelle + icônes Play + CTA clair + texte explicatif.</p>

      <div className="demo-area">
        <div className="helper-text">
          <Zap size={14} />
          <span>Plus l'extrait est court, plus ça rapporte !</span>
        </div>

        <div className="levels-grid-b">
          {SNIPPET_LEVELS.map((level, idx) => {
            const isLocked = idx > unlockedLevel;
            const isCurrent = currentLevel === idx;
            const isNext = idx === unlockedLevel && !isCurrent;
            const showCTA = isFirstTime && idx === 0;

            return (
              <motion.button
                key={idx}
                className={`level-card-b ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''} ${isNext ? 'next' : ''}`}
                onClick={() => !isLocked && handlePlayLevel(idx)}
                disabled={isLocked}
                whileHover={!isLocked ? { scale: 1.03 } : {}}
                whileTap={!isLocked ? { scale: 0.97 } : {}}
                animate={isNext && !isFirstTime ? {
                  boxShadow: ['0 0 0 0 rgba(251, 191, 36, 0)', '0 0 0 8px rgba(251, 191, 36, 0.3)', '0 0 0 0 rgba(251, 191, 36, 0)']
                } : {}}
                transition={isNext ? { duration: 1.5, repeat: Infinity } : {}}
              >
                <div className="card-b-icon">
                  {idx === 0 && <Zap size={18} />}
                  {idx === 1 && <Clock size={18} />}
                  {idx === 2 && <Timer size={18} />}
                  {idx === 3 && <Disc size={18} />}
                </div>

                {showCTA ? (
                  <motion.div
                    className="cta-label"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Play size={14} fill="currentColor" />
                    <span>Jouer</span>
                  </motion.div>
                ) : (
                  <span className="card-b-duration">{level.label}</span>
                )}

                <div className="card-b-points">
                  {!isLocked && <Play size={10} fill="currentColor" className="mini-play" />}
                  <span>+{level.start}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
        <button className="reset-btn" onClick={reset}>Reset démo</button>
      </div>
    </div>
  );
}

// ============================================
// OPTION C: Mode Simplifié
// ============================================
function OptionC() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [points, setPoints] = useState(200);

  const handlePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    setPoints(SNIPPET_LEVELS[currentLevel].start);

    // Simulate points decreasing
    const interval = setInterval(() => {
      setPoints(p => {
        const floor = SNIPPET_LEVELS[currentLevel].floor;
        if (p <= floor) {
          clearInterval(interval);
          return floor;
        }
        return p - 5;
      });
    }, 200);

    // Auto-stop after duration
    const duration = SNIPPET_LEVELS[currentLevel].duration || 5000;
    setTimeout(() => {
      setIsPlaying(false);
      clearInterval(interval);
    }, Math.min(duration, 3000));
  };

  const nextLevel = () => {
    if (currentLevel < 3) {
      setCurrentLevel(currentLevel + 1);
      setPoints(SNIPPET_LEVELS[currentLevel + 1].start);
    }
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentLevel(0);
    setPoints(200);
  };

  return (
    <div className="option-container">
      <h3>Option C : "Mode Simplifié"</h3>
      <p className="option-desc">Un seul bouton PLAY, niveau affiché en dessous, points en temps réel.</p>

      <div className="demo-area">
        <motion.button
          className={`simple-play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={handlePlay}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            className="simple-play-icon"
            animate={isPlaying ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5, repeat: isPlaying ? Infinity : 0 }}
          >
            {isPlaying ? <Volume2 size={28} /> : <Play size={28} fill="white" />}
          </motion.div>
          <span className="simple-play-label">{isPlaying ? 'EN COURS...' : 'JOUER'}</span>
        </motion.button>

        <div className="simple-info">
          <div className="simple-level">
            <span className="simple-level-label">Niveau</span>
            <span className="simple-level-value">{SNIPPET_LEVELS[currentLevel].label}</span>
          </div>
          <div className="simple-points">
            <span className="simple-points-label">Points</span>
            <motion.span
              className="simple-points-value"
              key={points}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
            >
              {points}
            </motion.span>
          </div>
        </div>

        <div className="simple-levels-indicator">
          {SNIPPET_LEVELS.map((level, idx) => (
            <div
              key={idx}
              className={`level-dot ${idx === currentLevel ? 'active' : ''} ${idx < currentLevel ? 'passed' : ''}`}
            >
              {level.label}
            </div>
          ))}
        </div>

        <div className="simple-actions">
          <button className="next-level-btn" onClick={nextLevel} disabled={currentLevel >= 3}>
            Niveau suivant <ChevronRight size={16} />
          </button>
          <button className="reset-btn" onClick={reset}>Reset</button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// OPTION D: Timeline Interactive (Simplifié)
// ============================================
function OptionD() {
  const [currentLevel, setCurrentLevel] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleClick = (idx) => {
    setCurrentLevel(idx);
    setProgress(0);

    // Simulate progress
    const duration = SNIPPET_LEVELS[idx].duration || 5000;
    const steps = 20;
    const stepDuration = Math.min(duration, 3000) / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      setProgress((step / steps) * 100);
      if (step >= steps) {
        clearInterval(interval);
      }
    }, stepDuration);
  };

  const reset = () => {
    setCurrentLevel(null);
    setProgress(0);
  };

  return (
    <div className="option-container">
      <h3>Option D : "Timeline Interactive" (Simplifié)</h3>
      <p className="option-desc">Barre de progression cliquable, points en dessous, highlight sur l'actif.</p>

      <div className="demo-area">
        <div className="timeline-container-v2">
          <div className="timeline-bar-v2">
            {SNIPPET_LEVELS.map((level, idx) => (
              <motion.button
                key={idx}
                className={`timeline-segment-v2 ${currentLevel === idx ? 'active' : ''}`}
                onClick={() => handleClick(idx)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="segment-fill-v2" style={{
                  width: currentLevel === idx ? `${progress}%` : currentLevel !== null && idx < currentLevel ? '100%' : '0%'
                }} />
                <span className="segment-label-v2">{level.label}</span>
                <Play size={12} fill="currentColor" className="segment-play-v2" />
              </motion.button>
            ))}
          </div>

          <div className="timeline-points-v2">
            {SNIPPET_LEVELS.map((level, idx) => (
              <div key={idx} className={`points-label-v2 ${currentLevel === idx ? 'active' : ''}`}>
                <span className="points-value-v2">+{level.start}</span>
                <span className="points-text-v2">points</span>
              </div>
            ))}
          </div>
        </div>

        <button className="reset-btn" onClick={reset}>Reset démo</button>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function SnippetUXDemo() {
  return (
    <div className="ux-demo-page">
      <header className="demo-header">
        <h1>🎵 Blind Test - UX Paliers</h1>
        <p>Comparaison des 4 concepts pour les boutons de durée d'extrait</p>
      </header>

      <div className="options-grid">
        <OptionA />
        <OptionB />
        <OptionC />
        <OptionD />
      </div>

      <style jsx global>{`
        .ux-demo-page {
          min-height: 100vh;
          background: linear-gradient(180deg, #0a0a0f 0%, #12121a 100%);
          padding: 20px;
          padding-bottom: 100px;
          color: white;
          overflow-y: auto !important;
          overflow-x: hidden;
        }

        html, body {
          overflow: auto !important;
          height: auto !important;
        }

        .demo-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .demo-header h1 {
          font-family: 'Bungee', cursive;
          font-size: 1.5rem;
          margin: 0 0 8px 0;
          background: linear-gradient(90deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .demo-header p {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.6);
          margin: 0;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .option-container {
          background: rgba(20, 20, 30, 0.8);
          border: 1px solid rgba(162, 56, 255, 0.2);
          border-radius: 16px;
          padding: 20px;
        }

        .option-container h3 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          color: ${DEEZER_PURPLE};
          margin: 0 0 8px 0;
        }

        .option-desc {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.5);
          margin: 0 0 16px 0;
          line-height: 1.4;
        }

        .demo-area {
          background: rgba(0,0,0,0.3);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .reset-btn {
          font-size: 0.7rem;
          padding: 6px 12px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          transition: all 0.2s;
        }

        .reset-btn:hover {
          background: rgba(255,255,255,0.15);
          color: white;
        }

        /* ========== OPTION A ========== */
        .big-play-button {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 32px;
          background: linear-gradient(135deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          border: none;
          border-radius: 20px;
          cursor: pointer;
          box-shadow: 0 8px 30px rgba(162, 56, 255, 0.4);
        }

        .big-play-icon {
          width: 56px;
          height: 56px;
          background: rgba(255,255,255,0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .big-play-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }

        .big-play-label {
          font-family: 'Bungee', cursive;
          font-size: 1.4rem;
          color: white;
        }

        .big-play-sub {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.8);
        }

        .levels-row {
          display: flex;
          gap: 8px;
          width: 100%;
          justify-content: center;
        }

        .level-btn {
          flex: 1;
          max-width: 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 8px;
          background: rgba(162, 56, 255, 0.15);
          border: 2px solid rgba(162, 56, 255, 0.4);
          border-radius: 12px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .level-btn.current {
          background: rgba(162, 56, 255, 0.3);
          border-color: ${DEEZER_PURPLE};
          box-shadow: 0 0 20px rgba(162, 56, 255, 0.4);
        }

        .level-btn.locked {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .level-play-icon {
          color: ${DEEZER_PURPLE};
        }

        .level-duration {
          font-weight: 700;
          font-size: 0.9rem;
        }

        .level-points {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.6);
        }

        /* ========== OPTION B ========== */
        .helper-text {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          color: #fbbf24;
          background: rgba(251, 191, 36, 0.1);
          padding: 8px 14px;
          border-radius: 20px;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }

        .levels-grid-b {
          display: flex;
          gap: 8px;
          width: 100%;
        }

        .level-card-b {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px 8px;
          background: linear-gradient(180deg, rgba(162, 56, 255, 0.12) 0%, rgba(162, 56, 255, 0.04) 100%);
          border: 2px solid rgba(162, 56, 255, 0.3);
          border-radius: 16px;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .level-card-b.current {
          background: linear-gradient(180deg, rgba(162, 56, 255, 0.35) 0%, rgba(162, 56, 255, 0.15) 100%);
          border-color: ${DEEZER_PURPLE};
          box-shadow: 0 0 25px rgba(162, 56, 255, 0.4);
        }

        .level-card-b.next {
          border-color: rgba(251, 191, 36, 0.6);
          background: linear-gradient(180deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 100%);
        }

        .level-card-b.locked {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .card-b-icon {
          width: 36px;
          height: 36px;
          background: rgba(162, 56, 255, 0.2);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${DEEZER_PURPLE};
        }

        .cta-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 700;
          font-size: 0.85rem;
          color: #22c55e;
        }

        .card-b-duration {
          font-weight: 700;
          font-size: 1rem;
        }

        .card-b-points {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.6);
          background: rgba(0,0,0,0.3);
          padding: 4px 10px;
          border-radius: 12px;
        }

        .mini-play {
          color: ${DEEZER_PURPLE};
        }

        /* ========== OPTION C ========== */
        .simple-play-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 24px 48px;
          background: linear-gradient(135deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          border: none;
          border-radius: 24px;
          cursor: pointer;
          box-shadow: 0 8px 30px rgba(162, 56, 255, 0.4);
          transition: all 0.2s;
        }

        .simple-play-btn.playing {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          box-shadow: 0 8px 30px rgba(34, 197, 94, 0.4);
        }

        .simple-play-icon {
          color: white;
        }

        .simple-play-label {
          font-family: 'Bungee', cursive;
          font-size: 1.1rem;
          color: white;
        }

        .simple-info {
          display: flex;
          gap: 24px;
        }

        .simple-level, .simple-points {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .simple-level-label, .simple-points-label {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
        }

        .simple-level-value {
          font-weight: 700;
          font-size: 1.2rem;
          color: ${DEEZER_PURPLE};
        }

        .simple-points-value {
          font-family: 'Bungee', cursive;
          font-size: 1.4rem;
          color: #22c55e;
        }

        .simple-levels-indicator {
          display: flex;
          gap: 8px;
        }

        .level-dot {
          padding: 6px 12px;
          background: rgba(255,255,255,0.1);
          border-radius: 20px;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.4);
          transition: all 0.2s;
        }

        .level-dot.active {
          background: ${DEEZER_PURPLE};
          color: white;
        }

        .level-dot.passed {
          background: rgba(162, 56, 255, 0.3);
          color: rgba(255,255,255,0.7);
        }

        .simple-actions {
          display: flex;
          gap: 8px;
        }

        .next-level-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 16px;
          background: rgba(162, 56, 255, 0.2);
          border: 1px solid rgba(162, 56, 255, 0.4);
          border-radius: 8px;
          color: ${DEEZER_PURPLE};
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .next-level-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .next-level-btn:hover:not(:disabled) {
          background: rgba(162, 56, 255, 0.3);
        }

        /* ========== OPTION D (Simplifié) ========== */
        .timeline-container-v2 {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .timeline-bar-v2 {
          display: flex;
          gap: 6px;
          background: rgba(0,0,0,0.3);
          padding: 6px;
          border-radius: 14px;
        }

        .timeline-segment-v2 {
          flex: 1;
          position: relative;
          height: 52px;
          background: rgba(162, 56, 255, 0.1);
          border: 2px solid rgba(162, 56, 255, 0.3);
          border-radius: 10px;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: white;
          transition: all 0.2s;
        }

        .timeline-segment-v2:hover {
          border-color: rgba(162, 56, 255, 0.6);
          background: rgba(162, 56, 255, 0.15);
        }

        .timeline-segment-v2.active {
          border-width: 3px;
          border-color: ${DEEZER_PURPLE};
          box-shadow:
            0 0 20px rgba(162, 56, 255, 0.5),
            inset 0 0 20px rgba(162, 56, 255, 0.1);
        }

        .segment-fill-v2 {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: linear-gradient(90deg, ${DEEZER_PURPLE}, ${DEEZER_PINK});
          transition: width 0.15s linear;
          opacity: 0.9;
        }

        .segment-label-v2 {
          position: relative;
          z-index: 1;
          font-weight: 700;
          font-size: 1rem;
        }

        .segment-play-v2 {
          position: relative;
          z-index: 1;
          opacity: 0.6;
        }

        .timeline-segment-v2.active .segment-play-v2 {
          opacity: 1;
        }

        .timeline-points-v2 {
          display: flex;
          gap: 6px;
          padding: 0 6px;
        }

        .points-label-v2 {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          transition: all 0.2s;
        }

        .points-value-v2 {
          font-size: 0.85rem;
          font-weight: 700;
          color: rgba(34, 197, 94, 0.7);
        }

        .points-text-v2 {
          font-size: 0.6rem;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .points-label-v2.active .points-value-v2 {
          color: #22c55e;
          text-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
          transform: scale(1.1);
        }

        .points-label-v2.active .points-text-v2 {
          color: rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </div>
  );
}
