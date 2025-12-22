// Dynamic import - canvas-confetti is only loaded when actually used
let confettiModule = null;

async function getConfetti() {
  if (!confettiModule) {
    confettiModule = (await import('canvas-confetti')).default;
  }
  return confettiModule;
}

/**
 * Helper pour déclencher des animations de confetti
 * @param {string} type - Type d'animation : 'success', 'victory', 'team', 'reward'
 * @param {string} customColor - Couleur personnalisée (hex) pour type 'team'
 * @param {object} origin - Position d'origine {x: 0-1, y: 0-1} (optionnel)
 */
export async function triggerConfetti(type = 'success', customColor = null, origin = { x: 0.5, y: 0.5 }) {
  const confetti = await getConfetti();

  const configs = {
    // Confetti rapide pour validation d'action
    success: {
      particleCount: 100,
      spread: 70,
      origin,
      colors: ['#10B981', '#34D399', '#6EE7B7'],
      startVelocity: 30,
      gravity: 1.2,
      scalar: 1
    },

    // Confetti multicolore rapide pour bonne réponse
    reward: {
      particleCount: 150,
      spread: 90,
      origin,
      colors: ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'],
      startVelocity: 40,
      gravity: 1.3,
      scalar: 1.1,
      ticks: 150
    },

    // Confetti explosif pour victoire finale
    victory: {
      particleCount: 200,
      spread: 100,
      origin,
      startVelocity: 45,
      gravity: 1,
      scalar: 1.2,
      ticks: 200
    },

    // Confetti aux couleurs de l'équipe
    team: {
      particleCount: 150,
      spread: 60,
      origin,
      colors: customColor ? [customColor] : ['#EF4444', '#F87171'],
      startVelocity: 35,
      gravity: 1.1,
      scalar: 1
    },

    // Confetti continu pour célébration prolongée
    continuous: {
      particleCount: 3,
      spread: 40,
      origin,
      startVelocity: 25,
      gravity: 1.3,
      scalar: 0.8
    }
  };

  const config = configs[type] || configs.success;
  confetti(config);
}

/**
 * Confetti en rafale (plusieurs explosions successives)
 */
export async function triggerConfettiBurst(count = 3, delay = 150) {
  // Pre-load confetti before starting interval
  await getConfetti();

  let fired = 0;
  const interval = setInterval(() => {
    triggerConfetti('success', null, {
      x: Math.random() * 0.4 + 0.3, // Entre 0.3 et 0.7
      y: Math.random() * 0.4 + 0.3
    });
    fired++;
    if (fired >= count) {
      clearInterval(interval);
    }
  }, delay);
}

/**
 * Confetti latéral (des deux côtés)
 */
export async function triggerConfettiSides() {
  const confetti = await getConfetti();

  // Côté gauche
  confetti({
    particleCount: 50,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.6 },
    colors: ['#EF4444', '#F87171', '#FCA5A5']
  });

  // Côté droit
  confetti({
    particleCount: 50,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.6 },
    colors: ['#10B981', '#34D399', '#6EE7B7']
  });
}

/**
 * Confetti depuis le bas (comme une fontaine)
 */
export async function triggerConfettiFountain(color = null) {
  const confetti = await getConfetti();

  confetti({
    particleCount: 80,
    angle: 90,
    spread: 45,
    origin: { x: 0.5, y: 1 },
    startVelocity: 60,
    colors: color ? [color] : ['#F59E0B', '#FBBF24', '#FCD34D'],
    gravity: 1.5
  });
}
