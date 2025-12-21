# 🎮 Guide de Style UI pour Jeux de Soirée

## Objectif

Transformer l'interface de Let's Queeeze et Alibi d'une "web app fonctionnelle" vers une **vraie interface de jeu mobile** immersive et engageante. Ce guide définit les standards visuels, animations et patterns à suivre.

---

## 1. Philosophie de Design

### ❌ Ce qu'on veut éviter (style "Web App")
- Interfaces plates sans profondeur
- Formulaires et inputs standards
- Boutons rectangulaires basiques
- Écrans qui scrollent comme des pages web
- Éléments statiques sans vie
- Espaces vides non utilisés

### ✅ Ce qu'on veut atteindre (style "Jeu Mobile")
- **Profondeur visuelle** : ombres, glows, relief 3D
- **Éléments vivants** : tout pulse, brille, réagit
- **Écrans contenus** : chaque vue tient dans le viewport (pas de scroll)
- **Feedback immédiat** : chaque action a une réponse visuelle
- **Ambiance immersive** : arrière-plans dynamiques, particules subtiles

---

## 2. Palette de Couleurs

### Couleurs Principales
```css
:root {
  /* Fond de base */
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-card: rgba(20, 20, 30, 0.8);
  
  /* Couleurs d'accent par jeu */
  --quiz-primary: #8b5cf6;      /* Violet */
  --quiz-glow: #a78bfa;
  --alibi-primary: #f59e0b;     /* Ambre/Or */
  --alibi-glow: #fbbf24;
  
  /* États */
  --success: #22c55e;
  --success-glow: #4ade80;
  --danger: #ef4444;
  --danger-glow: #f87171;
  --warning: #f59e0b;
  
  /* Texte */
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.7);
  --text-muted: rgba(255, 255, 255, 0.5);
}
```

### Règle d'Or : Les Glows
Chaque couleur d'accent doit avoir un **glow associé** (version plus claire de la couleur) utilisé pour les effets lumineux.

---

## 3. Typographie

### Polices Recommandées (Google Fonts)

```css
/* Titres de jeu - Impact, fun, mémorable */
@import url('https://fonts.googleapis.com/css2?family=Bungee&display=swap');
/* Alternative: Bangers, Luckiest Guy, Russo One */

/* Sous-titres et boutons - Bold, lisible */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap');

/* Corps de texte - Clean, moderne */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

### Hiérarchie Typographique
```css
.game-title {
  font-family: 'Bungee', cursive;
  font-size: clamp(2rem, 8vw, 4rem);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  /* Ajouter un glow sur le texte */
  text-shadow: 
    0 0 10px var(--quiz-glow),
    0 0 20px var(--quiz-glow),
    0 0 40px var(--quiz-primary);
}

.section-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.body-text {
  font-family: 'Inter', sans-serif;
  font-weight: 400;
  font-size: 1rem;
  line-height: 1.5;
}

.button-text {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

---

## 4. Composants UI

### 4.1 Boutons

#### Bouton Principal (CTA)
```css
.btn-primary {
  /* Base */
  background: linear-gradient(135deg, var(--quiz-primary), #7c3aed);
  border: none;
  border-radius: 12px;
  padding: 16px 32px;
  color: white;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  
  /* Ombre et profondeur */
  box-shadow: 
    0 4px 15px rgba(139, 92, 246, 0.4),
    0 0 30px rgba(139, 92, 246, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  
  /* Transition fluide */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 
    0 6px 20px rgba(139, 92, 246, 0.5),
    0 0 40px rgba(139, 92, 246, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.btn-primary:active {
  transform: translateY(1px) scale(0.98);
}
```

#### Bouton Buzzer (Style 3D Physique)
```css
.btn-buzzer {
  /* Forme circulaire */
  width: 180px;
  height: 180px;
  border-radius: 50%;
  
  /* Effet 3D */
  background: linear-gradient(145deg, #ef4444, #dc2626);
  border: 4px solid #b91c1c;
  box-shadow: 
    0 8px 0 #991b1b,
    0 15px 30px rgba(0, 0, 0, 0.4),
    inset 0 -4px 10px rgba(0, 0, 0, 0.3),
    inset 0 4px 10px rgba(255, 255, 255, 0.2);
  
  /* Animation de pulsation */
  animation: buzzer-pulse 2s ease-in-out infinite;
  
  transition: all 0.1s ease;
}

.btn-buzzer:active {
  transform: translateY(4px);
  box-shadow: 
    0 4px 0 #991b1b,
    0 8px 15px rgba(0, 0, 0, 0.4),
    inset 0 -2px 5px rgba(0, 0, 0, 0.3),
    inset 0 2px 5px rgba(255, 255, 255, 0.2);
}

@keyframes buzzer-pulse {
  0%, 100% { 
    box-shadow: 
      0 8px 0 #991b1b,
      0 15px 30px rgba(0, 0, 0, 0.4),
      0 0 20px rgba(239, 68, 68, 0.3),
      inset 0 -4px 10px rgba(0, 0, 0, 0.3),
      inset 0 4px 10px rgba(255, 255, 255, 0.2);
  }
  50% { 
    box-shadow: 
      0 8px 0 #991b1b,
      0 15px 30px rgba(0, 0, 0, 0.4),
      0 0 40px rgba(239, 68, 68, 0.5),
      inset 0 -4px 10px rgba(0, 0, 0, 0.3),
      inset 0 4px 10px rgba(255, 255, 255, 0.2);
  }
}
```

### 4.2 Cartes

#### Carte de Jeu (Accueil)
```css
.game-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: var(--bg-card);
  backdrop-filter: blur(10px);
  
  /* Bordure lumineuse */
  border: 2px solid transparent;
  background-clip: padding-box;
  
  /* Ombre et profondeur */
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Bordure avec gradient */
.game-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 2px;
  background: linear-gradient(135deg, var(--quiz-primary), var(--quiz-glow));
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.game-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 
    0 8px 30px rgba(0, 0, 0, 0.4),
    0 0 40px rgba(139, 92, 246, 0.2);
}

.game-card:hover::before {
  opacity: 1;
}
```

#### Carte Joueur (Lobby/Classement)
```css
.player-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  /* Animation d'entrée */
  animation: slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.player-card.highlight {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
  border-color: var(--quiz-primary);
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### 4.3 Inputs

```css
.game-input {
  width: 100%;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  letter-spacing: 0.05em;
  
  transition: all 0.3s ease;
}

.game-input:focus {
  outline: none;
  border-color: var(--quiz-primary);
  background: rgba(139, 92, 246, 0.1);
  box-shadow: 
    0 0 0 4px rgba(139, 92, 246, 0.2),
    0 0 20px rgba(139, 92, 246, 0.1);
}

.game-input::placeholder {
  color: var(--text-muted);
}
```

### 4.4 Barres de Progression

```css
.progress-bar {
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--warning), var(--success));
  border-radius: 6px;
  position: relative;
  transition: width 0.1s linear;
  
  /* Effet de brillance animée */
  overflow: hidden;
}

.progress-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  100% { left: 100%; }
}

/* Urgence quand le temps presse */
.progress-bar-fill.urgent {
  background: linear-gradient(90deg, var(--danger), var(--warning));
  animation: urgency-pulse 0.5s ease-in-out infinite;
}

@keyframes urgency-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

### 4.5 Carte d'Invitation (Lobby)

La carte d'invitation doit être **l'élément le plus visible** du lobby pour que les joueurs puissent facilement rejoindre.

```css
.invite-card {
  /* Fond avec gradient subtil de la couleur d'accent */
  background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.1), rgba(var(--accent-rgb), 0.05));
  border: 2px solid rgba(var(--accent-rgb), 0.3);
  border-radius: 20px;
  padding: 1.5rem;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);

  /* Ombre avec glow de la couleur d'accent */
  box-shadow:
    0 4px 30px rgba(var(--accent-rgb), 0.15),
    0 0 60px rgba(var(--accent-rgb), 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  position: relative;
  overflow: hidden;
}

/* Animation de glow pulsant en arrière-plan */
.invite-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.1) 0%, transparent 50%);
  animation: invite-glow 4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes invite-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

/* Titre de la carte */
.invite-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--accent-glow);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-align: center;
  margin-bottom: 1rem;
}

/* Code de la room - TRÈS visible */
.room-code {
  font-family: 'Roboto Mono', monospace;
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  letter-spacing: 0.2em;
  text-shadow:
    0 0 20px var(--accent-glow),
    0 0 40px rgba(var(--accent-rgb), 0.4);
  margin-bottom: 0.5rem;
}

/* URL en petit sous le code */
.invite-url {
  font-family: 'Roboto Mono', monospace;
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
  word-break: break-all;
  margin-bottom: 1rem;
}

/* Boutons d'action (Copier, QR Code) */
.invite-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
```

#### Comportement des boutons d'invitation

```jsx
// Bouton "Copier le lien" avec feedback visuel
<motion.button
  className="btn btn-accent copy-btn"
  onClick={async () => {
    await navigator.clipboard.writeText(joinUrl);
    // Feedback visuel
    btn.textContent = '✓ Copié !';
    setTimeout(() => { btn.textContent = original; }, 2000);
  }}
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  📋 Copier le lien
</motion.button>

// Bouton QR Code
<motion.button
  className="btn btn-accent"
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  📱 QR Code
</motion.button>
```

---

## 5. Animations & Micro-interactions

### 5.1 Animations d'Entrée (avec Framer Motion)

```jsx
// Animation de page
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.3 }
  }
};

// Animation staggerée pour les listes
const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  }
};
```

### 5.2 Animations de Feedback

```jsx
// Bouton avec feedback tactile
const buttonVariants = {
  tap: { scale: 0.95 },
  hover: { scale: 1.05 }
};

// Shake pour erreur
const shakeAnimation = {
  x: [0, -10, 10, -10, 10, 0],
  transition: { duration: 0.5 }
};

// Pop pour succès
const popAnimation = {
  scale: [1, 1.2, 1],
  transition: { 
    duration: 0.3,
    times: [0, 0.5, 1]
  }
};
```

### 5.3 Animations CSS Clés

```css
/* Pulsation subtile (pour attirer l'attention) */
@keyframes pulse {
  0%, 100% { 
    transform: scale(1);
    opacity: 1;
  }
  50% { 
    transform: scale(1.05);
    opacity: 0.9;
  }
}

/* Flottement (pour éléments en attente) */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Rotation continue (pour loaders) */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Apparition avec glow */
@keyframes glow-in {
  from {
    opacity: 0;
    filter: blur(10px);
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
  }
}

/* Confettis / Celebration */
@keyframes confetti-fall {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}
```

---

## 6. Layouts Spécifiques

### 6.1 Écran de Jeu (Mobile-First, Sans Scroll)

```css
.game-screen {
  min-height: 100dvh; /* Dynamic viewport height */
  display: flex;
  flex-direction: column;
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: var(--bg-primary);
  overflow: hidden; /* Pas de scroll ! */
}

.game-header {
  flex-shrink: 0;
  /* Contenu fixe en haut */
}

.game-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  /* Contenu principal centré */
}

.game-footer {
  flex-shrink: 0;
  /* Actions principales en bas */
}
```

### 6.2 Modal/Overlay (Buzz, Résultats)

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  
  animation: fade-in 0.3s ease;
}

.modal-content {
  background: var(--bg-card);
  border-radius: 24px;
  padding: 32px;
  max-width: 90vw;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 20px 50px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  
  animation: modal-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modal-pop {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

---

## 7. Éléments d'Ambiance

### 7.1 Arrière-plan Animé

```css
.animated-background {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: 
    radial-gradient(ellipse at 20% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(245, 158, 11, 0.1) 0%, transparent 50%),
    var(--bg-primary);
}

/* Particules optionnelles (avec canvas ou CSS) */
.particles {
  position: fixed;
  inset: 0;
  z-index: -1;
  opacity: 0.5;
}
```

### 7.2 Éléments Décoratifs

```css
/* Cercle lumineux en fond */
.glow-orb {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--quiz-primary) 0%, transparent 70%);
  opacity: 0.1;
  filter: blur(60px);
  animation: float 8s ease-in-out infinite;
}

/* Lignes de grille subtiles */
.grid-pattern {
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 50px 50px;
}
```

---

## 8. États Spéciaux

### 8.1 Loading / Attente

```jsx
// Composant Loading stylisé
const GameLoader = () => (
  <div className="loader-container">
    <div className="loader-dots">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="dot"
          animate={{
            y: [0, -15, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15
          }}
        />
      ))}
    </div>
    <p className="loader-text">En attente...</p>
  </div>
);
```

### 8.2 Victoire / Célébration

```jsx
// Écran de victoire avec confettis
const VictoryScreen = ({ winner }) => (
  <motion.div
    className="victory-screen"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    {/* Confettis en arrière-plan */}
    <Confetti numberOfPieces={200} />
    
    {/* Avatar du gagnant avec animation */}
    <motion.div
      className="winner-avatar"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 200,
        damping: 15
      }}
    >
      {/* Couronne animée */}
      <motion.div
        className="crown"
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        👑
      </motion.div>
      <Avatar name={winner.name} />
    </motion.div>
    
    {/* Podium avec effet glow */}
    <motion.div
      className="podium"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <div className="rank">1</div>
    </motion.div>
  </motion.div>
);
```

---

## 9. Navigation

### 9.1 Bottom Navigation (Style Jeu)

```css
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 12px;
  color: var(--text-muted);
  transition: all 0.3s ease;
}

.nav-item.active {
  color: var(--quiz-primary);
  background: rgba(139, 92, 246, 0.1);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  top: -12px;
  width: 40px;
  height: 4px;
  background: var(--quiz-primary);
  border-radius: 2px;
  box-shadow: 0 0 10px var(--quiz-glow);
}

.nav-icon {
  font-size: 24px;
}

.nav-label {
  font-size: 12px;
  font-weight: 500;
}
```

---

## 10. Checklist d'Implémentation

### Pour chaque écran, vérifier :

- [ ] **Pas de scroll** - Tout tient dans le viewport
- [ ] **Titre stylisé** - Font display + glow
- [ ] **Boutons avec profondeur** - Ombres + hover + active states
- [ ] **Cartes avec bordures lumineuses** - Gradient borders
- [ ] **Animations d'entrée** - Fade + slide pour chaque élément
- [ ] **Feedback tactile** - Scale on tap pour tous les éléments cliquables
- [ ] **États de chargement** - Loaders stylisés, jamais de texte seul
- [ ] **Arrière-plan avec ambiance** - Gradients subtils ou particules

### Priorité d'implémentation :

1. **Écran de jeu (question + buzzer)** - C'est le cœur de l'expérience
2. **Écran de victoire** - Première impression mémorable
3. **Lobby** - Où les joueurs attendent
4. **Page d'accueil** - Présentation des jeux
5. **Formulaire de jonction** - Première interaction d'un joueur

---

## 11. Ressources

### Librairies Recommandées

```bash
# Animations
npm install framer-motion

# Confettis
npm install react-confetti

# Icônes
npm install lucide-react

# Sons (optionnel mais recommandé)
npm install howler
```

### Références Visuelles

- **Kahoot** - Couleurs vives, animations de célébration
- **Jackbox Games** - Typographie bold, ambiance festive
- **Among Us** - Personnages simples, UI claire
- **Trivia Crack** - Éléments 3D stylisés

---

## 12. Exemples de Code Complets

### Bouton Buzz avec Framer Motion

```jsx
import { motion } from 'framer-motion';

const BuzzButton = ({ onBuzz, disabled, state }) => {
  const getButtonStyle = () => {
    switch (state) {
      case 'ready':
        return 'bg-gradient-to-b from-red-500 to-red-600 shadow-red';
      case 'buzzed':
        return 'bg-gradient-to-b from-green-500 to-green-600 shadow-green';
      case 'disabled':
        return 'bg-gradient-to-b from-gray-600 to-gray-700 opacity-50';
      default:
        return 'bg-gradient-to-b from-red-500 to-red-600';
    }
  };

  return (
    <motion.button
      className={`
        w-44 h-44 rounded-full
        flex items-center justify-center
        text-white font-bold text-2xl uppercase
        border-4 border-red-700
        ${getButtonStyle()}
      `}
      style={{
        boxShadow: state === 'ready' 
          ? '0 8px 0 #991b1b, 0 0 30px rgba(239, 68, 68, 0.4)'
          : state === 'buzzed'
          ? '0 8px 0 #166534, 0 0 40px rgba(34, 197, 94, 0.5)'
          : '0 4px 0 #374151'
      }}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95, y: 4 } : {}}
      animate={state === 'ready' ? {
        boxShadow: [
          '0 8px 0 #991b1b, 0 0 30px rgba(239, 68, 68, 0.3)',
          '0 8px 0 #991b1b, 0 0 50px rgba(239, 68, 68, 0.6)',
          '0 8px 0 #991b1b, 0 0 30px rgba(239, 68, 68, 0.3)',
        ]
      } : {}}
      transition={{
        boxShadow: { repeat: Infinity, duration: 2 }
      }}
      onClick={onBuzz}
      disabled={disabled}
    >
      {state === 'buzzed' ? '✓' : 'BUZZ'}
    </motion.button>
  );
};
```

### Carte de Jeu avec Hover

```jsx
import { motion } from 'framer-motion';

const GameCard = ({ game, onClick }) => {
  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden cursor-pointer"
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {/* Bordure gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-300 opacity-60" />
      
      {/* Contenu */}
      <div className="relative m-[2px] rounded-2xl overflow-hidden bg-gray-900">
        <img 
          src={game.image} 
          alt={game.name}
          className="w-full aspect-video object-cover"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-xl font-bold text-white">
            {game.name}
          </h3>
          <p className="text-sm text-white/70">
            {game.minPlayers}-{game.maxPlayers} joueurs
          </p>
        </div>
        
        {/* Badge favori */}
        <motion.button
          className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          ♥
        </motion.button>
      </div>
    </motion.div>
  );
};
```

---

**Ce guide doit être lu par Claude Code AVANT de commencer tout travail sur l'UI. Chaque modification doit respecter ces standards pour maintenir la cohérence et l'immersion.**