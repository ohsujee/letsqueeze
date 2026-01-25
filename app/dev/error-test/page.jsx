'use client';

import { useState } from 'react';
import { ErrorBoundary, GameErrorBoundary } from '@/components/shared/ErrorBoundary';

function CrashButton({ type }) {
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error(`Test error - ${type}`);
  }

  return (
    <button
      onClick={() => setShouldCrash(true)}
      style={{
        padding: '2vh 4vw',
        background: type === 'game'
          ? 'linear-gradient(135deg, #8b5cf6, #7c3aed)'
          : 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: 'white',
        border: 'none',
        borderRadius: '2vh',
        fontFamily: 'var(--font-display)',
        fontSize: '2vh',
        fontWeight: 700,
        cursor: 'pointer',
        width: '100%'
      }}
    >
      {type === 'game' ? '🎮 Tester GameErrorBoundary' : '💥 Tester ErrorBoundary'}
    </button>
  );
}

export default function ErrorTestPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary, #0a0a0f)',
      padding: '5vh 5vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4vh'
    }}>
      <h1 style={{
        fontFamily: 'var(--font-title)',
        fontSize: '4vh',
        color: 'white',
        textAlign: 'center'
      }}>
        Test des pages d'erreur
      </h1>

      <p style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.8vh',
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        Clique sur un bouton pour déclencher une erreur et voir la page correspondante.
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2vh',
        width: '100%',
        maxWidth: '350px'
      }}>
        <ErrorBoundary>
          <CrashButton type="default" />
        </ErrorBoundary>

        <GameErrorBoundary>
          <CrashButton type="game" />
        </GameErrorBoundary>
      </div>
    </div>
  );
}
