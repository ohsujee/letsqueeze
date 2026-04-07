"use client";

import { useEffect, useState } from "react";
import './lobby-entry.css';

/**
 * Transition d'entrée dans le lobby — Flat Cartoon Style
 * Fond solide couleur du jeu, porte animée, progress bar épaisse
 */
export function LobbyEntryTransition({ gameColor, playerName, onComplete, duration = 2000 }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
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
      {/* Background — solid flat color */}
      <div className="lobby-transition-bg" />

      {/* Content */}
      <div className="lobby-transition-content">
        {/* Door */}
        <div className="lobby-transition-door-wrapper">
          <div className="lobby-transition-door-frame">
            <div className="lobby-transition-door-light" />
            <div className="lobby-transition-door" />
          </div>
        </div>

        {/* Text */}
        <h1 className="lobby-transition-title">Vous entrez dans le lobby</h1>
        <p className="lobby-transition-subtitle">{playerName}, préparez-vous...</p>

        {/* Progress bar — flat chunky */}
        <div className="lobby-transition-progress">
          <div
            className="lobby-transition-progress-bar"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      </div>
    </div>
  );
}
