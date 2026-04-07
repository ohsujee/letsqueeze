'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import HeartSVG from '@/components/ui/HeartSVG';

const MAX_HEARTS = 5;
const HEADER_3D_STYLE = { perspective: 600, transformStyle: 'preserve-3d' };

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
              <HeartSVG key={i} full={i < heartsRemaining} size={20} />
            ))}
          </div>
        </motion.button>
      )}
    </div>
  );
}
