import { Component } from 'react';

/**
 * Error boundary pour les leaderboards daily.
 * Attrape les erreurs (Firebase timeout, data corrompue) sans crasher toute la page.
 */
export default class LeaderboardErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="wordle-lb-empty">
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <p>Erreur de chargement du classement</p>
        </div>
      );
    }
    return this.props.children;
  }
}
