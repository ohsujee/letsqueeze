"use client";
import confetti from 'canvas-confetti';

export const ParticleEffects = {
  // Explosion de confettis (bonne réponse)
  celebrate: (intensity = 'high') => {
    const configs = {
      low: { particleCount: 50, spread: 60 },
      medium: { particleCount: 100, spread: 80 },
      high: { particleCount: 150, spread: 100 }
    };

    const config = configs[intensity];

    // Canon gauche
    confetti({
      ...config,
      origin: { x: 0.2, y: 0.8 },
      angle: 60,
      colors: ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#06B6D4']
    });

    // Canon droite
    confetti({
      ...config,
      origin: { x: 0.8, y: 0.8 },
      angle: 120,
      colors: ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#06B6D4']
    });

    // Centre (delayed)
    setTimeout(() => {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FF4500']
      });
    }, 200);
  },

  // Pluie d'étoiles (podium)
  starRain: () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 90,
        spread: 45,
        origin: { x: Math.random(), y: 0 },
        colors: ['#FFD700', '#FFA500'],
        shapes: ['star'],
        scalar: 1.2,
        gravity: 0.5,
        drift: Math.random() * 2 - 1
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  },

  // Feu d'artifice (fin de partie)
  fireworks: () => {
    const duration = 5000;
    const end = Date.now() + duration;

    const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'];

    const frame = () => {
      // Random explosions
      confetti({
        particleCount: 100,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: Math.random(),
          y: Math.random() * 0.6
        },
        colors: colors,
        ticks: 200
      });

      if (Date.now() < end) {
        setTimeout(() => requestAnimationFrame(frame), Math.random() * 1000);
      }
    };
    frame();
  },

  // Erreur (nuage rouge)
  wrongAnswer: () => {
    confetti({
      particleCount: 30,
      spread: 100,
      origin: { x: 0.5, y: 0.6 },
      colors: ['#EF4444', '#DC2626', '#B91C1C'],
      shapes: ['circle'],
      scalar: 0.8,
      gravity: 1.5,
      startVelocity: 15
    });
  },

  // Buzz anticipé (éclair bleu)
  anticipatedBuzz: () => {
    confetti({
      particleCount: 50,
      spread: 60,
      startVelocity: 40,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#3B82F6', '#60A5FA', '#93C5FD'],
      shapes: ['square'],
      scalar: 1.5,
      gravity: 0.8
    });
  }
};
