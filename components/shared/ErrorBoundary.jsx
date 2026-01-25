'use client';

import { Component } from 'react';
import { Home, RotateCcw } from 'lucide-react';

/**
 * ErrorBoundary - Capture les erreurs React et affiche un fallback
 * Empêche le crash complet de l'application
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/home';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-page">
          <div className="error-bg-effects">
            <div className="error-glow error-glow-1" />
            <div className="error-glow error-glow-2" />
          </div>

          <div className="error-card">
            <div className="error-icon-wrapper">
              <span className="error-icon">💥</span>
              <div className="error-icon-ring" />
            </div>

            <h2 className="error-title">Oops !</h2>
            <p className="error-subtitle">Quelque chose s'est cassé...</p>

            {this.props.showError && this.state.error?.message && (
              <div className="error-details">
                <code>{this.state.error.message}</code>
              </div>
            )}

            <div className="error-actions">
              <button className="error-btn error-btn-primary" onClick={this.handleGoHome}>
                <Home size={20} />
                <span>Retour à l'accueil</span>
              </button>
              <button className="error-btn error-btn-secondary" onClick={this.handleRetry}>
                <RotateCcw size={18} />
                <span>Réessayer</span>
              </button>
            </div>
          </div>

          <style jsx>{`
            .error-boundary-page {
              position: fixed;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--bg-primary, #0a0a0f);
              padding: 5vw;
              z-index: 9999;
            }

            .error-bg-effects {
              position: absolute;
              inset: 0;
              overflow: hidden;
              pointer-events: none;
            }

            .error-glow {
              position: absolute;
              border-radius: 50%;
              filter: blur(80px);
              opacity: 0.4;
            }

            .error-glow-1 {
              width: 50vw;
              height: 50vw;
              background: radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, transparent 70%);
              top: -10%;
              left: -10%;
              animation: float-glow 8s ease-in-out infinite;
            }

            .error-glow-2 {
              width: 40vw;
              height: 40vw;
              background: radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%);
              bottom: -5%;
              right: -5%;
              animation: float-glow 10s ease-in-out infinite reverse;
            }

            @keyframes float-glow {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(20px, -20px) scale(1.1); }
            }

            .error-card {
              position: relative;
              z-index: 1;
              width: 100%;
              max-width: 420px;
              background: rgba(20, 20, 30, 0.8);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 3vh;
              padding: 5vh 6vw;
              text-align: center;
              box-shadow:
                0 0 0 1px rgba(239, 68, 68, 0.1),
                0 20px 50px rgba(0, 0, 0, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.05);
            }

            .error-icon-wrapper {
              position: relative;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 2.5vh;
            }

            .error-icon {
              font-size: 8vh;
              line-height: 1;
              animation: bounce-icon 2s ease-in-out infinite;
            }

            .error-icon-ring {
              position: absolute;
              inset: -15%;
              border: 2px solid rgba(239, 68, 68, 0.3);
              border-radius: 50%;
              animation: pulse-ring 2s ease-out infinite;
            }

            @keyframes bounce-icon {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              25% { transform: translateY(-5px) rotate(-5deg); }
              75% { transform: translateY(-5px) rotate(5deg); }
            }

            @keyframes pulse-ring {
              0% { transform: scale(0.8); opacity: 1; }
              100% { transform: scale(1.5); opacity: 0; }
            }

            .error-title {
              font-family: var(--font-title, 'Bungee'), cursive;
              font-size: 4.5vh;
              color: #f87171;
              margin: 0 0 1vh 0;
              text-shadow: 0 0 30px rgba(239, 68, 68, 0.5);
            }

            .error-subtitle {
              font-family: var(--font-display, 'Space Grotesk'), sans-serif;
              font-size: 2vh;
              font-weight: 500;
              color: var(--text-secondary, rgba(255, 255, 255, 0.6));
              margin: 0 0 3vh 0;
            }

            .error-details {
              background: rgba(0, 0, 0, 0.3);
              border: 1px solid rgba(239, 68, 68, 0.2);
              border-radius: 1.5vh;
              padding: 1.5vh 2vw;
              margin-bottom: 3vh;
              overflow: hidden;
            }

            .error-details code {
              font-family: var(--font-mono, 'Roboto Mono'), monospace;
              font-size: 1.4vh;
              color: rgba(248, 113, 113, 0.8);
              word-break: break-word;
            }

            .error-actions {
              display: flex;
              flex-direction: column;
              gap: 1.5vh;
            }

            .error-btn {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 2vw;
              width: 100%;
              padding: 2vh 4vw;
              border: none;
              border-radius: 2vh;
              font-family: var(--font-display, 'Space Grotesk'), sans-serif;
              font-size: 1.8vh;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .error-btn-primary {
              background: linear-gradient(135deg, #8b5cf6, #6d28d9);
              color: white;
              box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
            }

            .error-btn-primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 25px rgba(139, 92, 246, 0.5);
            }

            .error-btn-primary:active {
              transform: translateY(0);
            }

            .error-btn-secondary {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.15);
              color: var(--text-secondary, rgba(255, 255, 255, 0.7));
            }

            .error-btn-secondary:hover {
              background: rgba(255, 255, 255, 0.1);
              border-color: rgba(255, 255, 255, 0.25);
              color: var(--text-primary, white);
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * GameErrorBoundary - Error boundary spécifique pour les jeux
 */
export class GameErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Game Error:', error, errorInfo);
  }

  handleGoHome = () => {
    window.location.href = '/home';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="game-error-page">
          <div className="game-error-bg">
            <div className="game-error-glow game-error-glow-1" />
            <div className="game-error-glow game-error-glow-2" />
          </div>

          <div className="game-error-card">
            <div className="game-error-icon-wrapper">
              <span className="game-error-icon">🎮</span>
              <div className="game-error-icon-pulse" />
            </div>

            <h3 className="game-error-title">Partie interrompue</h3>
            <p className="game-error-subtitle">
              Un problème est survenu pendant la partie.
              <br />Pas de panique, ça arrive !
            </p>

            <div className="game-error-actions">
              <button className="game-error-btn game-error-btn-primary" onClick={this.handleGoHome}>
                <Home size={20} />
                <span>Retour à l'accueil</span>
              </button>
              <button className="game-error-btn game-error-btn-secondary" onClick={() => window.location.reload()}>
                <RotateCcw size={18} />
                <span>Recharger la page</span>
              </button>
            </div>
          </div>

          <style jsx>{`
            .game-error-page {
              position: fixed;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--bg-primary, #0a0a0f);
              padding: 5vw;
              z-index: 9999;
            }

            .game-error-bg {
              position: absolute;
              inset: 0;
              overflow: hidden;
              pointer-events: none;
            }

            .game-error-glow {
              position: absolute;
              border-radius: 50%;
              filter: blur(80px);
              opacity: 0.35;
            }

            .game-error-glow-1 {
              width: 50vw;
              height: 50vw;
              background: radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, transparent 70%);
              top: -15%;
              right: -10%;
              animation: game-float 10s ease-in-out infinite;
            }

            .game-error-glow-2 {
              width: 45vw;
              height: 45vw;
              background: radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%);
              bottom: -10%;
              left: -10%;
              animation: game-float 8s ease-in-out infinite reverse;
            }

            @keyframes game-float {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(-15px, 15px) scale(1.05); }
            }

            .game-error-card {
              position: relative;
              z-index: 1;
              width: 100%;
              max-width: 420px;
              background: rgba(20, 20, 30, 0.85);
              backdrop-filter: blur(24px);
              -webkit-backdrop-filter: blur(24px);
              border: 1px solid rgba(139, 92, 246, 0.2);
              border-radius: 3vh;
              padding: 5vh 6vw;
              text-align: center;
              box-shadow:
                0 0 0 1px rgba(139, 92, 246, 0.1),
                0 25px 60px rgba(0, 0, 0, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.05);
            }

            .game-error-icon-wrapper {
              position: relative;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 2.5vh;
            }

            .game-error-icon {
              font-size: 8vh;
              line-height: 1;
              animation: game-wobble 3s ease-in-out infinite;
            }

            .game-error-icon-pulse {
              position: absolute;
              inset: -20%;
              border: 2px solid rgba(139, 92, 246, 0.4);
              border-radius: 50%;
              animation: game-pulse 2s ease-out infinite;
            }

            @keyframes game-wobble {
              0%, 100% { transform: rotate(0deg); }
              25% { transform: rotate(-8deg); }
              75% { transform: rotate(8deg); }
            }

            @keyframes game-pulse {
              0% { transform: scale(0.8); opacity: 1; }
              100% { transform: scale(1.6); opacity: 0; }
            }

            .game-error-title {
              font-family: var(--font-title, 'Bungee'), cursive;
              font-size: 3.5vh;
              color: #a78bfa;
              margin: 0 0 1.5vh 0;
              text-shadow: 0 0 25px rgba(139, 92, 246, 0.5);
            }

            .game-error-subtitle {
              font-family: var(--font-display, 'Space Grotesk'), sans-serif;
              font-size: 1.8vh;
              font-weight: 500;
              color: var(--text-secondary, rgba(255, 255, 255, 0.6));
              margin: 0 0 3.5vh 0;
              line-height: 1.5;
            }

            .game-error-actions {
              display: flex;
              flex-direction: column;
              gap: 1.5vh;
            }

            .game-error-btn {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 2vw;
              width: 100%;
              padding: 2vh 4vw;
              border: none;
              border-radius: 2vh;
              font-family: var(--font-display, 'Space Grotesk'), sans-serif;
              font-size: 1.8vh;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .game-error-btn-primary {
              background: linear-gradient(135deg, #8b5cf6, #7c3aed);
              color: white;
              box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
            }

            .game-error-btn-primary:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 25px rgba(139, 92, 246, 0.5);
            }

            .game-error-btn-primary:active {
              transform: translateY(0);
            }

            .game-error-btn-secondary {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.15);
              color: var(--text-secondary, rgba(255, 255, 255, 0.7));
            }

            .game-error-btn-secondary:hover {
              background: rgba(255, 255, 255, 0.1);
              border-color: rgba(255, 255, 255, 0.25);
              color: var(--text-primary, white);
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
