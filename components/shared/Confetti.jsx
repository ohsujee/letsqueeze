// DISABLED: Confetti causes white square glitches on mobile
// All functions return early without doing anything

/**
 * Helper pour déclencher des animations de confetti
 * DISABLED - causes rendering glitches on mobile
 */
export async function triggerConfetti(type = 'success', customColor = null, origin = { x: 0.5, y: 0.5 }) {
  return; // Disabled due to glitches

  // Original code kept for reference:
  /*
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

  */
}

/**
 * Confetti en rafale - DISABLED
 */
export async function triggerConfettiBurst(count = 3, delay = 150) {
  return; // Disabled due to glitches
}

/**
 * Confetti latéral - DISABLED
 */
export async function triggerConfettiSides() {
  return; // Disabled due to glitches
}

/**
 * Confetti depuis le bas - DISABLED
 */
export async function triggerConfettiFountain(color = null) {
  return; // Disabled due to glitches
}
