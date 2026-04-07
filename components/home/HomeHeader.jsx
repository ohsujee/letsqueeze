'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';

const MAX_HEARTS = 5;
const HEADER_3D_STYLE = { perspective: 600, transformStyle: 'preserve-3d' };

// SVG heart flat — fill et stroke contrôlés directement
function HeartIcon({ full }) {
  return (
    <svg
      width="20"
      height="19"
      viewBox="0 0 455.111 455.111"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {full ? (
        <>
          <path fill="#E24C4B" d="M455.111,164.089c0,137.956-163.556,228.978-213.333,253.156c-8.533,4.267-19.911,4.267-28.444,0C163.556,393.067,0,304.889,0,164.089C0,92.978,52.622,34.667,116.622,34.667c51.2,0,93.867,35.556,109.511,85.333c15.644-49.778,59.733-85.333,109.511-85.333C402.489,34.667,455.111,92.978,455.111,164.089z" />
          <path fill="#D1403F" d="M455.111,164.089c0,137.956-163.556,228.978-213.333,253.156c-8.533,4.267-19.911,4.267-29.867,0c-22.756-9.956-65.422-34.133-108.089-68.267h1.422c135.111,0,243.2-109.511,243.2-243.2c0-24.178-4.267-48.356-11.378-71.111C403.911,36.089,455.111,92.978,455.111,164.089z" />
          <path fill="#FFFFFF" opacity="0.2" d="M109.511,142.756c-22.756,5.689-44.089-2.844-48.356-18.489C58.311,107.2,72.533,90.133,95.289,84.444s44.089,2.844,48.356,18.489C147.911,120,132.267,137.067,109.511,142.756z" />
        </>
      ) : (
        <path fill="rgba(255,255,255,0.2)" d="M455.111,164.089c0,137.956-163.556,228.978-213.333,253.156c-8.533,4.267-19.911,4.267-28.444,0C163.556,393.067,0,304.889,0,164.089C0,92.978,52.622,34.667,116.622,34.667c51.2,0,93.867,35.556,109.511,85.333c15.644-49.778,59.733-85.333,109.511-85.333C402.489,34.667,455.111,92.978,455.111,164.089z" />
      )}
    </svg>
  );
}

export default function HomeHeader({
  displayName,
  avatarInitial,
  avatarId,
  avatarColor,
  isPro,
  heartsRemaining = MAX_HEARTS,
  heartsVisible = true,
  onHeartsClick,
  onAvatarClick,
}) {
  const isEmpty = heartsRemaining === 0;
  const hasLostHeart = heartsRemaining < MAX_HEARTS;

  return (
    <div className={`home-header-wrapper${isPro ? ' home-header-wrapper--pro' : ''}`}>
      <header className="home-header-modern">
        <Avatar initial={avatarInitial} size="sm" showStatus avatarId={avatarId} avatarColor={avatarColor} onClick={onAvatarClick} />

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

      {/* Cœurs : étiquette flat collée derrière le header */}
      {!isPro && heartsVisible && (
        <motion.button
          className={`hearts-tag${isEmpty ? ' hearts-tag--empty' : ''}`}
          onClick={onHeartsClick}
          whileTap={{ scale: 0.98 }}
          title={`${heartsRemaining}/${MAX_HEARTS} cœurs`}
        >
          <span className="hearts-tag-text">
            {isEmpty ? 'Plus de cœurs !' : hasLostHeart ? 'Recharge tes cœurs !' : 'Prêt à jouer !'}
          </span>
          <div className="hearts-row">
            {Array.from({ length: MAX_HEARTS }).map((_, i) => (
              <HeartIcon key={i} full={i < heartsRemaining} />
            ))}
          </div>
        </motion.button>
      )}
    </div>
  );
}
