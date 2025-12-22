"use client";

// Dynamic import - canvas-confetti is only loaded when actually used
let confettiModule = null;

async function getConfetti() {
  if (!confettiModule) {
    confettiModule = (await import('canvas-confetti')).default;
  }
  return confettiModule;
}

export const ParticleEffects = {
  // Explosion de confettis (bonne réponse)
  celebrate: async (intensity = 'high') => {
    const confetti = await getConfetti();

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

  // Pluie d'étoiles (podium) - Version subtile
  starRain: async () => {
    const confetti = await getConfetti();

    const duration = 2000;
    const end = Date.now() + duration;
    let lastTime = 0;

    const frame = (currentTime) => {
      // Throttle: une particule toutes les 150ms
      if (currentTime - lastTime > 150) {
        confetti({
          particleCount: 1,
          angle: 90,
          spread: 30,
          origin: { x: Math.random(), y: 0 },
          colors: ['#FFD700', '#C0C0C0', '#CD7F32', '#FFA500'], // Or, Argent, Bronze, Orange
          shapes: ['star'],
          scalar: 0.8,
          gravity: 0.6,
          drift: Math.random() * 1.5 - 0.75,
          ticks: 120
        });
        lastTime = currentTime;
      }

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  },

  // Feu d'artifice (fin de partie) - Version élégante
  fireworks: async () => {
    const confetti = await getConfetti();

    const duration = 3000;
    const end = Date.now() + duration;

    // Palette sophistiquée : or, argent, bronze, violet profond, bleu nuit
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#6366F1', '#0EA5E9'];

    const frame = () => {
      // Petites explosions espacées
      confetti({
        particleCount: 35,
        startVelocity: 20,
        spread: 360,
        origin: {
          x: 0.3 + Math.random() * 0.4,
          y: 0.2 + Math.random() * 0.4
        },
        colors: colors,
        ticks: 120,
        scalar: 0.9
      });

      if (Date.now() < end) {
        setTimeout(() => requestAnimationFrame(frame), 400 + Math.random() * 600);
      }
    };
    frame();
  },

  // Erreur (nuage rouge)
  wrongAnswer: async () => {
    const confetti = await getConfetti();

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
  anticipatedBuzz: async () => {
    const confetti = await getConfetti();

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
