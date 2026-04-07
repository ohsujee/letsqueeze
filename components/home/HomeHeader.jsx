'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';

const MAX_HEARTS = 5;
const HEADER_3D_STYLE = { perspective: 600, transformStyle: 'preserve-3d' };

// SVG heart flat — fill et stroke contrôlés directement
function HeartIcon({ full }) {
  return (
    <svg
      width="18"
      height="17"
      viewBox="0 0 24 22"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <path
        d="M12 21C12 21 2 14 2 7.5C2 4.42 4.42 2 7.5 2C9.24 2 10.91 2.81 12 4.09C13.09 2.81 14.76 2 16.5 2C19.58 2 22 4.42 22 7.5C22 14 12 21 12 21Z"
        fill={full ? '#ff2d55' : 'rgba(255,255,255,0.07)'}
        stroke={full ? '#c41230' : 'rgba(255,255,255,0.18)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {full && (
        <path
          d="M8.5 7.5C8.5 7.5 9.5 6 11.5 6.5"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export default function HomeHeader({
  displayName,
  avatarInitial,
  isPro,
  heartsRemaining = MAX_HEARTS,
  heartsVisible = true,
  onHeartsClick,
}) {
  const isEmpty = heartsRemaining === 0;
  const hasLostHeart = heartsRemaining < MAX_HEARTS;

  return (
    <div className={`home-header-wrapper${isPro ? ' home-header-wrapper--pro' : ''}`}>
      <header className="home-header-modern">
        <div className="avatar-container">
          <div className="avatar-placeholder">{avatarInitial}</div>
          <div className="avatar-status"></div>
        </div>

        <h1 className="user-name">{displayName}</h1>

        {/* Toujours présent pour garder le pseudo centré */}
        <div className="header-actions" style={HEADER_3D_STYLE}>
          <AnimatePresence>
            {isPro && (
              <motion.div
                className="pro-badge-circle"
                key="pro-badge"
                initial={{ rotateY: 720, opacity: 0, scale: 0.5 }}
                animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                exit={{ rotateY: 90, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Membre Pro"
              >
                <div className="pro-badge-face">
                  <Crown size={20} strokeWidth={2.5} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Cœurs : anchor positionné en absolu, flex centre la pill sans left:50% */}
      {!isPro && heartsVisible && (
        <div className="hearts-anchor">
          <motion.button
            className={`hearts-bar${isEmpty ? ' hearts-bar--empty' : ''}`}
            onClick={onHeartsClick}
            whileTap={{ scale: 0.94 }}
            title={`${heartsRemaining}/${MAX_HEARTS} cœurs`}
          >
            <div className="hearts-row">
              {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                <HeartIcon key={i} full={i < heartsRemaining} />
              ))}
            </div>
            {hasLostHeart && (
              <span className="hearts-bar-plus">+</span>
            )}
          </motion.button>
        </div>
      )}
    </div>
  );
}
