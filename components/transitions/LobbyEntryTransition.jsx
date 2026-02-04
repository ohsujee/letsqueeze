"use client";

import { useEffect, useState } from "react";

/**
 * Transition d'entrée dans le lobby - Version optimisée
 * Utilise des CSS animations pour de meilleures performances sur mobile
 */
export function LobbyEntryTransition({ gameColor, playerName, onComplete, duration = 2000 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Small delay before calling onComplete to allow fade out
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className="lobby-transition-overlay"
      style={{ '--game-color': gameColor }}
    >
      {/* Background gradient */}
      <div className="lobby-transition-bg" />

      {/* Content */}
      <div className="lobby-transition-content">
        {/* Door icon with CSS animation */}
        <div className="lobby-transition-door-wrapper">
          <div className="lobby-transition-door-frame">
            <div className="lobby-transition-door-light" />
            <div className="lobby-transition-door" />
          </div>
        </div>

        {/* Text */}
        <h1 className="lobby-transition-title">Vous entrez dans le lobby</h1>
        <p className="lobby-transition-subtitle">{playerName}, préparez-vous...</p>

        {/* Progress bar */}
        <div className="lobby-transition-progress">
          <div
            className="lobby-transition-progress-bar"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      </div>

      <style jsx global>{`
        .lobby-transition-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: lobby-fade-in 0.3s ease-out;
        }

        .lobby-transition-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, var(--game-color, #8b5cf6) 0%, color-mix(in srgb, var(--game-color, #8b5cf6) 70%, black) 100%);
        }

        .lobby-transition-content {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 2rem;
          animation: lobby-content-in 0.5s ease-out 0.1s both;
        }

        .lobby-transition-door-wrapper {
          margin-bottom: 1.5rem;
          animation: lobby-door-bounce 0.6s ease-out 0.2s both;
        }

        .lobby-transition-door-frame {
          position: relative;
          width: 80px;
          height: 100px;
          margin: 0 auto;
          border: 4px solid white;
          border-radius: 4px;
          background: rgba(255,255,255,0.1);
          perspective: 400px;
        }

        .lobby-transition-door-light {
          position: absolute;
          inset: 4px;
          background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.8) 100%);
          border-radius: 2px;
          animation: lobby-light-glow 1s ease-in-out 0.5s both;
        }

        .lobby-transition-door {
          position: absolute;
          top: 4px;
          left: 4px;
          width: calc(100% - 8px);
          height: calc(100% - 8px);
          background: var(--game-color, #8b5cf6);
          border: 2px solid white;
          border-radius: 2px;
          transform-origin: left center;
          animation: lobby-door-open 0.8s ease-out 0.4s both;
        }

        .lobby-transition-door::after {
          content: '';
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
        }

        .lobby-transition-title {
          font-family: 'Bungee', cursive;
          font-size: clamp(1.3rem, 5vw, 2rem);
          color: white;
          margin: 0 0 0.5rem 0;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          text-shadow: 0 2px 20px rgba(0,0,0,0.3);
        }

        .lobby-transition-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: clamp(0.9rem, 3vw, 1.2rem);
          color: rgba(255,255,255,0.85);
          margin: 0 0 1.5rem 0;
        }

        .lobby-transition-progress {
          width: 150px;
          height: 3px;
          margin: 0 auto;
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
          overflow: hidden;
        }

        .lobby-transition-progress-bar {
          height: 100%;
          background: white;
          border-radius: 2px;
          animation: lobby-progress linear forwards;
          animation-duration: inherit;
        }

        @keyframes lobby-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes lobby-content-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes lobby-door-bounce {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          70% {
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes lobby-door-open {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(-60deg); }
        }

        @keyframes lobby-light-glow {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes lobby-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
