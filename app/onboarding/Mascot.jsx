/**
 * Mascot — Composant mascotte avec image ou placeholder
 */

const MASCOT_IMAGES = {
  welcome: '/images/mascot/giggly-excited.webp',
  ready: '/images/mascot/giggly-determined.webp',
  curious: '/images/mascot/giggly-curious.webp',
  warning: '/images/mascot/giggly-worried.webp',
};

export default function Mascot({ emotion = 'welcome', size = 200 }) {
  const imageSrc = MASCOT_IMAGES[emotion];

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt="Giggly"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
        }}
        draggable={false}
      />
    );
  }

  const emotionLabels = {
    welcome: '🐧 Excité\nBras ouverts',
    ready: '🐧 Motivé\nPrêt à jouer',
    curious: '🐧 Curieux\nTête penchée',
    warning: '🐧 Inquiet\nMains levées',
  };

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 20,
      background: 'rgba(255, 255, 255, 0.05)',
      border: '2px dashed rgba(255, 255, 255, 0.2)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }}>
      <span style={{ fontSize: size * 0.3 }}>🐧</span>
      <span style={{
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'center',
        whiteSpace: 'pre-line',
        fontFamily: 'Inter, sans-serif',
      }}>
        {emotionLabels[emotion]}
      </span>
    </div>
  );
}
