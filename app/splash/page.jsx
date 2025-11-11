'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, auth } from '@/lib/firebase';
import { Zap } from 'lucide-react';

export default function SplashScreen() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');

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

      <div className="splash-content">
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
      </div>

      <style jsx>{`
        .splash-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          position: relative;
          overflow: hidden;
        }

        /* Animated Orbs - Floating Background */
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
          background: var(--brand-electric);
          top: -100px;
          right: -100px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 250px;
          height: 250px;
          background: var(--brand-violet);
          bottom: -80px;
          left: -80px;
          animation-delay: 2s;
        }

        .orb-3 {
          width: 200px;
          height: 200px;
          background: var(--brand-neon);
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
          border: 3px solid var(--brand-electric);
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
          background: var(--gradient-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow:
            0 10px 40px rgba(0, 0, 0, 0.3),
            0 0 60px var(--glow-electric);
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

        /* Title with Animated Gradient */
        .splash-title {
          font-family: var(--font-display);
          font-size: clamp(2.5rem, 10vw, 4rem);
          font-weight: var(--font-weight-black);
          line-height: var(--line-height-tight);
          letter-spacing: var(--letter-spacing-tight);
          margin-bottom: 0.5rem;
          background: var(--gradient-primary);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient-shift 3s ease infinite;
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
          font-size: var(--font-size-lg);
          color: var(--text-secondary);
          font-weight: var(--font-weight-semibold);
          margin-bottom: 3rem;
          animation: fadeIn 0.8s ease-in 0.3s both;
        }

        /* Loading Bar with Gradient */
        .loading-container {
          width: 200px;
          height: 4px;
          background: var(--bg-tertiary);
          border-radius: var(--radius-full);
          margin: 0 auto;
          overflow: hidden;
          animation: fadeIn 1s ease-in 0.5s both;
        }

        .loading-bar {
          height: 100%;
          background: var(--gradient-primary);
          border-radius: var(--radius-full);
          animation: loading 2s ease-in-out infinite;
          box-shadow: 0 0 20px var(--glow-electric);
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
