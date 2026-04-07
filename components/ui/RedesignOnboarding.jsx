'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CaretRight, Check } from '@phosphor-icons/react';
import { getAvatarUrl } from '@/lib/config/avatars';
import { storage } from '@/lib/utils/storage';
import './redesign-onboarding.css';

const PREVIEW_MINI = [
  { id: 'parrot', color: '#8b5cf6' },
  { id: 'penguin', color: '#3b82f6' },
  { id: 'fox', color: '#f97316' },
  { id: 'bear', color: '#22c55e' },
];

const PREVIEW_WILD = [
  { id: 'v2-tiger', color: '#ef4444' },
  { id: 'v2-eagle', color: '#fbbf24' },
  { id: 'v2-shark', color: '#06b6d4' },
  { id: 'v2-wolf', color: '#64748b' },
];

const SLIDE_BG = ['#8b5cf6', '#6366f1'];
const FEATURE_COLORS = ['#f97316', '#ec4899', '#3b82f6'];

export default function RedesignOnboarding({ onComplete }) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const touchStart = useRef(null);

  const handleTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (diff > 50 && slide < 1) setSlide(1);
    if (diff < -50 && slide > 0) setSlide(0);
    touchStart.current = null;
  };

  const handleChooseAvatar = () => {
    storage.set('hasSeenRedesignOnboarding', true);
    onComplete?.();
    router.push('/profile?pickAvatar=1');
  };

  const handleSkip = () => {
    storage.set('hasSeenRedesignOnboarding', true);
    storage.set('showAvatarTipOnProfile', true);
    onComplete?.();
  };

  return (
    <div
      className="ro-overlay"
      style={{ backgroundColor: SLIDE_BG[slide] }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="ro-carousel">
        <motion.div
          className="ro-track"
          animate={{ x: `${-slide * 50}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Slide 1 */}
          <div className="ro-slide">
            <div className="ro-mascot-container">
              <img
                src="/images/mascot/giggly-excited.webp"
                alt="Giggly"
                className="ro-mascot"
                draggable={false}
              />
            </div>

            <h1 className="ro-title">Gigglz fait peau neuve !</h1>
            <p className="ro-description">
              On a tout repensé pour toi.<br />Découvre ce qui a changé !
            </p>

            <div className="ro-features">
              <div className="ro-feature-item">
                <span className="ro-feature-emoji" style={{ backgroundColor: FEATURE_COLORS[0] }}>🎨</span>
                <span className="ro-feature-text">Un tout nouveau design</span>
              </div>
              <div className="ro-feature-item">
                <span className="ro-feature-emoji" style={{ backgroundColor: FEATURE_COLORS[1] }}>🐻</span>
                <span className="ro-feature-text">Choisis ton avatar</span>
              </div>
              <div className="ro-feature-item">
                <span className="ro-feature-emoji" style={{ backgroundColor: FEATURE_COLORS[2] }}>🎮</span>
                <span className="ro-feature-text">Expérience de jeu améliorée</span>
              </div>
            </div>

            <div className="ro-footer">
              <button className="ro-btn-next" onClick={() => setSlide(1)}>
                Découvrir
                <CaretRight size={20} weight="bold" />
              </button>
            </div>
          </div>

          {/* Slide 2 */}
          <div className="ro-slide">
            <div className="ro-mascot-container">
              <img
                src="/images/mascot/giggly-determined.webp"
                alt="Giggly"
                className="ro-mascot"
                draggable={false}
              />
            </div>

            <h1 className="ro-title">Choisis ton avatar !</h1>
            <p className="ro-description">
              Choisis ton avatar et montre qui tu es dans chaque partie !
            </p>

            <div className="ro-avatar-rows">
              <div className="ro-avatar-grid">
                {PREVIEW_MINI.map((avatar) => (
                  <div
                    key={avatar.id}
                    className="ro-avatar-item"
                    style={{ backgroundColor: avatar.color }}
                  >
                    <img src={getAvatarUrl(avatar.id)} alt="" draggable={false} />
                  </div>
                ))}
              </div>
              <div className="ro-avatar-grid">
                {PREVIEW_WILD.map((avatar) => (
                  <div
                    key={avatar.id}
                    className="ro-avatar-item"
                    style={{ backgroundColor: avatar.color }}
                  >
                    <img src={getAvatarUrl(avatar.id)} alt="" draggable={false} />
                  </div>
                ))}
              </div>
            </div>

            <div className="ro-footer">
              <button className="ro-btn-skip" onClick={handleSkip}>
                Plus tard
              </button>
              <button className="ro-btn-avatar" onClick={handleChooseAvatar}>
                Choisir mon avatar
                <Check size={20} weight="bold" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="ro-dots">
        <div className={`ro-dot ${slide === 0 ? 'active' : ''}`} />
        <div className={`ro-dot ${slide === 1 ? 'active' : ''}`} />
      </div>
    </div>
  );
}
