# Instructions d'intégration du Module Philips Hue

## Contexte
Ce module permet de contrôler les lumières Philips Hue pendant les jeux. Il est conçu pour être réutilisable sur tous les jeux du projet Let's Queeeze.

**IMPORTANT**: La fonctionnalité Hue ne doit être visible et accessible que pour l'utilisateur admin avec l'email: `yogarajah.sujeevan@gmail.com`

---

## Fichiers à intégrer

Copie le dossier `hue-module/` dans le projet (par exemple dans `src/` ou à la racine selon la structure).

### Structure du module:
```
hue-module/
├── index.js                    # Exports centralisés
├── services/
│   ├── hueService.js          # Connexion bridge + contrôle lampes
│   └── hueScenariosService.js # Scénarios lumineux prédéfinis
└── components/
    ├── HueConnection.jsx      # UI connexion au bridge
    ├── HueLightSelector.jsx   # UI sélection des lampes
    ├── HueGameConfig.jsx      # UI config par jeu
    └── HueSettingsSection.jsx # Section complète pour Profil
```

---

## Étape 1: Intégration dans la page Profil/Settings

### 1.1 Importer le composant
```jsx
import { HueSettingsSection } from '@/hue-module';
// ou selon le chemin: import { HueSettingsSection } from '../hue-module';
```

### 1.2 Ajouter dans la page Profil
```jsx
// Dans la page profil, après avoir récupéré l'utilisateur connecté
const user = auth.currentUser; // ou ta méthode pour récupérer l'user

// Dans le JSX:
<HueSettingsSection 
  userEmail={user?.email} 
  adminEmail="yogarajah.sujeevan@gmail.com" 
/>
```

Le composant gère automatiquement la vérification admin - il ne s'affiche que si l'email correspond.

---

## Étape 2: Intégration dans un jeu (exemple: Alibi)

### 2.1 Importer le service
```jsx
import { hueScenariosService } from '@/hue-module';
```

### 2.2 Déclencher les effets aux bons moments

```jsx
// Début de partie / Ambiance globale
useEffect(() => {
  hueScenariosService.trigger('alibi', 'ambiance');
}, []);

// Début d'un interrogatoire
const startInterrogation = () => {
  hueScenariosService.trigger('alibi', 'roundStart');
  // ... reste du code
};

// Bonne réponse
const handleCorrectAnswer = () => {
  hueScenariosService.trigger('alibi', 'goodAnswer');
  // ... reste du code
};

// Mauvaise réponse
const handleWrongAnswer = () => {
  hueScenariosService.trigger('alibi', 'badAnswer');
  // ... reste du code
};

// Temps écoulé
const handleTimeUp = () => {
  hueScenariosService.trigger('alibi', 'timeUp');
  // ... reste du code
};

// Fin de partie
const endGame = (score, maxScore) => {
  const ratio = score / maxScore;
  if (ratio >= 0.7) {
    hueScenariosService.trigger('alibi', 'victory');
  } else {
    hueScenariosService.trigger('alibi', 'defeat');
  }
  // ... reste du code
};

// Nettoyage en quittant
useEffect(() => {
  return () => {
    hueScenariosService.testScenario('reset');
  };
}, []);
```

---

## Étape 3: Ajouter un nouveau jeu

### 3.1 Dans `components/HueGameConfig.jsx`, ajouter le jeu dans `GAME_EVENTS`:

```jsx
const GAME_EVENTS = {
  alibi: {
    name: 'Alibi',
    events: [
      // ... événements existants
    ]
  },
  // AJOUTER ICI:
  nouveauJeu: {
    name: 'Nom du Jeu',
    events: [
      { id: 'ambiance', name: 'Ambiance globale', description: 'Description...' },
      { id: 'eventCustom', name: 'Événement custom', description: 'Description...' },
      // ... autres événements
    ]
  }
};
```

### 3.2 Dans le code du jeu, utiliser:
```jsx
hueScenariosService.trigger('nouveauJeu', 'eventCustom');
```

---

## Événements Alibi à câbler

| Événement | ID | Quand le déclencher |
|-----------|-----|---------------------|
| Ambiance globale | `ambiance` | Au chargement de la partie |
| Début interrogatoire | `roundStart` | Après la lecture des alibis, début de l'interrogatoire |
| Bonne réponse | `goodAnswer` | Quand le joueur identifie correctement le coupable |
| Mauvaise réponse | `badAnswer` | Quand le joueur se trompe |
| Temps écoulé | `timeUp` | Quand le timer arrive à 0 |
| Fin - Bon score | `victory` | À la fin si score >= 70% |
| Fin - Mauvais score | `defeat` | À la fin si score < 70% |

---

## Notes techniques

1. **Pas de dépendances externes** - Le module utilise uniquement l'API REST native du bridge Hue et fetch()

2. **Stockage local** - Les configs sont stockées dans localStorage:
   - `hue_config`: IP bridge, token, lampes sélectionnées
   - `hue_game_configs`: Mapping événements/scénarios par jeu

3. **Réseau local requis** - L'API Hue locale ne fonctionne que si l'appareil est sur le même WiFi que le bridge

4. **Gestion des erreurs** - Les appels Hue sont silencieux en cas d'erreur (pas de crash si bridge déconnecté)

5. **Admin only** - Vérifier que `userEmail === 'yogarajah.sujeevan@gmail.com'` avant d'afficher quoi que ce soit lié à Hue

---

## Test rapide

Pour tester manuellement un scénario:
```jsx
import { hueScenariosService } from '@/hue-module';

// Dans la console ou un bouton de test:
hueScenariosService.testScenario('goodAnswer');
hueScenariosService.testScenario('victory');
```
