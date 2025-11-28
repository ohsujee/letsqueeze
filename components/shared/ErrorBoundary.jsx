'use client';

import { Component } from 'react';

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

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">Oups, une erreur est survenue</h2>
            <p className="error-message">
              {this.props.showError && this.state.error?.message}
            </p>
            <button className="error-button" onClick={this.handleRetry}>
              Réessayer
            </button>
          </div>

          <style jsx>{`
            .error-boundary {
              min-height: 200px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2rem;
            }

            .error-content {
              text-align: center;
              max-width: 400px;
            }

            .error-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }

            .error-title {
              font-size: 1.5rem;
              font-weight: 700;
              color: var(--text-primary);
              margin-bottom: 0.5rem;
            }

            .error-message {
              color: var(--text-secondary);
              font-size: 0.875rem;
              margin-bottom: 1.5rem;
            }

            .error-button {
              padding: 0.75rem 2rem;
              background: var(--brand-electric);
              color: white;
              border: none;
              border-radius: 12px;
              font-weight: 600;
              cursor: pointer;
              transition: transform 0.2s, box-shadow 0.2s;
            }

            .error-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }

            .error-button:active {
              transform: translateY(0);
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

  render() {
    if (this.state.hasError) {
      return (
        <div className="game-error">
          <div className="game-error-content">
            <span className="game-error-emoji">🎮</span>
            <h3>Erreur de jeu</h3>
            <p>La partie a rencontré un problème.</p>
            <button onClick={() => window.location.reload()}>
              Recharger
            </button>
          </div>

          <style jsx>{`
            .game-error {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--bg-primary);
              padding: 2rem;
            }

            .game-error-content {
              text-align: center;
              background: var(--bg-card);
              padding: 3rem;
              border-radius: 24px;
              border: 1px solid var(--border-primary);
            }

            .game-error-emoji {
              font-size: 4rem;
              display: block;
              margin-bottom: 1rem;
            }

            .game-error-content h3 {
              font-size: 1.5rem;
              color: var(--text-primary);
              margin-bottom: 0.5rem;
            }

            .game-error-content p {
              color: var(--text-secondary);
              margin-bottom: 1.5rem;
            }

            .game-error-content button {
              padding: 1rem 2rem;
              background: var(--gradient-primary);
              color: white;
              border: none;
              border-radius: 12px;
              font-weight: 700;
              cursor: pointer;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
