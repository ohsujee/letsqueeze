'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/utils/storage';
import { motion, AnimatePresence } from 'framer-motion';

const slides = [
  {
    id: 1,
    icon: '🎮🎯🎲',
    title: 'LetsQueeze',
    description: 'Jeux Multijoueur Entre Amis',
    color: '#4285F4', // Blue
  },
  {
    id: 2,
    icon: '🎯',
    title: '3 Jeux Disponibles',
    description: 'Quiz Buzzer • Alibi • Buzzer Seul',
    subtitle: 'Jouez jusqu\'à 8 joueurs !',
    color: '#34A853', // Green
  },
  {
    id: 3,
    icon: '✨',
    title: 'Gratuit + Pro',
    description: '✓ 3 packs gratuits\n✓ Mode Buzzer illimité\n✓ Multijoueur temps réel',
    subtitle: '🌟 Déverrouillez tout avec Pro',
    color: '#FBBC04', // Yellow
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    // Mark onboarding as seen
    storage.set('hasSeenOnboarding', true);
    router.push('/login');
  };

  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="onboarding-screen" style={{ background: slide.color }}>
      <motion.div
        className="onboarding-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Slide Content */}
        <AnimatePresence mode="wait">
          <motion.div
            className="slide-content"
            key={slide.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            {/* Icon */}
            <div className="slide-icon">{slide.icon}</div>

          {/* Title */}
          <h1 className="slide-title">{slide.title}</h1>

          {/* Description */}
          <p className="slide-description">{slide.description}</p>

            {/* Subtitle */}
            {slide.subtitle && (
              <p className="slide-subtitle">{slide.subtitle}</p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom Section */}
        <div className="onboarding-bottom">
          {/* Dots Indicator */}
          <div className="dots-indicator">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Aller à la slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Next Button */}
          <motion.button
            className="btn-next"
            onClick={handleNext}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLastSlide ? 'Commencer' : 'Suivant'}
          </motion.button>
        </div>
      </motion.div>

      <style jsx>{`
        .onboarding-screen {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
          transition: background 0.5s ease;
        }

        .onboarding-content {
          width: 100%;
          max-width: 500px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 80vh;
        }

        .slide-content {
          text-align: center;
          animation: slideIn 0.5s ease;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 2rem 0;
        }

        .slide-icon {
          font-size: 5rem;
          margin-bottom: 2rem;
          animation: float 3s ease-in-out infinite;
        }

        .slide-title {
          font-size: 2.5rem;
          font-weight: 900;
          color: white;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .slide-description {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.95);
          font-weight: 500;
          line-height: 1.8;
          white-space: pre-line;
          margin-bottom: 0.5rem;
        }

        .slide-subtitle {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 600;
          margin-top: 1.5rem;
        }

        .onboarding-bottom {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding-bottom: 2rem;
        }

        .dots-indicator {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
        }

        .dot.active {
          width: 32px;
          border-radius: 5px;
          background: white;
        }

        .dot:hover {
          background: rgba(255, 255, 255, 0.7);
        }

        .btn-next {
          width: 100%;
          padding: 1rem 2rem;
          background: white;
          color: ${slide.color};
          border: none;
          border-radius: 12px;
          font-size: 1.125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-next:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .btn-next:active {
          transform: translateY(0);
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        /* Background decoration */
        .onboarding-screen::before {
          content: '';
          position: absolute;
          width: 400px;
          height: 400px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          top: -200px;
          right: -200px;
        }

        .onboarding-screen::after {
          content: '';
          position: absolute;
          width: 300px;
          height: 300px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          bottom: -150px;
          left: -150px;
        }

        /* Mobile adjustments */
        @media (max-width: 640px) {
          .slide-title {
            font-size: 2rem;
          }

          .slide-icon {
            font-size: 4rem;
          }

          .slide-description {
            font-size: 1.125rem;
          }
        }
      `}</style>
    </div>
  );
}
