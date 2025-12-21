'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, auth } from '@/lib/firebase';
import { storage } from '@/lib/utils/storage';
import { Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = storage.get('hasSeenOnboarding');

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setTimeout(() => {
        if (!hasSeenOnboarding) {
          // First time user → onboarding
          router.push('/onboarding');
        } else if (!user) {
          // Returning user but not logged in → login
          router.push('/login');
        } else {
          // Logged in user → home
          router.push('/home');
        }
      }, 2000); // 2s splash duration for dramatic effect
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="splash-screen">
      {/* Animated Background Orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      <motion.div
        className="splash-content"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Logo with Pulsing Glow */}
        <div className="splash-logo">
          <div className="logo-ring"></div>
          <div className="logo-icon">
            <Zap size={64} strokeWidth={2.5} fill="currentColor" />
          </div>
        </div>

        {/* App Name with Gradient Animation */}
        <h1 className="splash-title gradient-text">LetsQueeze</h1>
        <p className="splash-subtitle">Jeux Multijoueur Entre Amis</p>

        {/* Loading Bar */}
        <div className="loading-container">
          <div className="loading-bar"></div>
        </div>
      </motion.div>

      <style jsx>{`
        .splash-screen {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary, #0a0a0f);
          position: relative;
          overflow: hidden;
        }

        /* Animated Orbs - Floating Background - Guide Colors */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.6;
          animation: float 8s ease-in-out infinite;
        }

        .orb-1 {
          width: 300px;
          height: 300px;
          background: var(--quiz-primary, #8b5cf6);
          top: -100px;
          right: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 250px;
          height: 250px;
          background: var(--alibi-primary, #f59e0b);
          bottom: -80px;
          left: -80px;
          animation-delay: 2s;
        }

        .orb-3 {
          width: 200px;
          height: 200px;
          background: var(--success, #22c55e);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: 4s;
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(30px, -30px) scale(1.1);
          }
          50% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          75% {
            transform: translate(20px, 30px) scale(1.05);
          }
        }

        .splash-content {
          text-align: center;
          z-index: 10;
          animation: fadeIn 0.6s ease-in;
        }

        /* Logo with Pulsing Ring */
        .splash-logo {
          margin-bottom: 2rem;
          position: relative;
          display: inline-block;
        }

        .logo-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 140px;
          height: 140px;
          border-radius: 50%;
          border: 3px solid var(--quiz-primary, #8b5cf6);
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse-ring {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.5;
          }
        }

        .logo-icon {
          width: 120px;
          height: 120px;
          background: linear-gradient(135deg, var(--quiz-primary, #8b5cf6), var(--quiz-secondary, #7c3aed));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow:
            0 10px 40px rgba(0, 0, 0, 0.3),
            0 0 60px rgba(139, 92, 246, 0.4);
          animation: bounce 2s ease-in-out infinite;
          position: relative;
          z-index: 2;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-15px) rotate(5deg);
          }
        }

        /* Title with Animated Gradient - Guide Compliant */
        .splash-title {
          font-family: var(--font-title, 'Bungee'), cursive;
          font-size: clamp(2.5rem, 10vw, 4rem);
          font-weight: 400;
          line-height: 1.2;
          letter-spacing: 0.02em;
          margin-bottom: 0.5rem;
          color: var(--text-primary, #ffffff);
          text-shadow:
            0 0 10px rgba(139, 92, 246, 0.5),
            0 0 30px rgba(139, 92, 246, 0.3),
            0 0 60px rgba(139, 92, 246, 0.2);
          animation: glow-pulse 3s ease-in-out infinite;
        }

        @keyframes glow-pulse {
          0%, 100% {
            text-shadow:
              0 0 10px rgba(139, 92, 246, 0.5),
              0 0 30px rgba(139, 92, 246, 0.3),
              0 0 60px rgba(139, 92, 246, 0.2);
          }
          50% {
            text-shadow:
              0 0 20px rgba(139, 92, 246, 0.7),
              0 0 40px rgba(139, 92, 246, 0.5),
              0 0 80px rgba(139, 92, 246, 0.3);
          }
        }

        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .splash-subtitle {
          font-family: var(--font-display, 'Space Grotesk'), sans-serif;
          font-size: var(--font-size-lg, 1.125rem);
          color: var(--text-secondary, rgba(255, 255, 255, 0.7));
          font-weight: 600;
          margin-bottom: 3rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          animation: fadeIn 0.8s ease-in 0.3s both;
        }

        /* Loading Bar with Gradient */
        .loading-container {
          width: 200px;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
          margin: 0 auto;
          overflow: hidden;
          animation: fadeIn 1s ease-in 0.5s both;
        }

        .loading-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--quiz-primary, #8b5cf6), var(--quiz-secondary, #7c3aed), var(--alibi-primary, #f59e0b));
          border-radius: 9999px;
          animation: loading 2s ease-in-out infinite;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
        }

        @keyframes loading {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 70%;
            margin-left: 15%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Mobile adjustments */
        @media (max-width: 640px) {
          .orb {
            filter: blur(40px);
          }

          .logo-icon {
            width: 100px;
            height: 100px;
          }

          .logo-icon :global(svg) {
            width: 48px;
            height: 48px;
          }

          .logo-ring {
            width: 120px;
            height: 120px;
          }

          .splash-subtitle {
            font-size: var(--font-size-base);
          }

          .loading-container {
            width: 160px;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .orb,
          .logo-ring,
          .logo-icon,
          .splash-title,
          .loading-bar {
            animation: none;
          }

          .splash-title {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
}
