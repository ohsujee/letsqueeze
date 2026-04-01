'use client';

import { Component } from 'react';
import { Home, RotateCcw } from 'lucide-react';
import './ErrorBoundary.css';

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

        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
