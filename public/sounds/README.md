# 🎵 Sons pour LetsQueeze

Cette appli utilise des sons pour créer une expérience immersive de type game show TV. Voici comment configurer les fichiers audio.

## 📂 Structure des Dossiers

```
public/sounds/
├── ui/                      # Sons d'interface utilisateur
│   ├── button-click.mp3
│   ├── button-hover.mp3
│   ├── swoosh-in.mp3
│   └── swoosh-out.mp3
├── game/                    # Sons du jeu
│   ├── reveal-dramatic.mp3
│   ├── buzz-alert.mp3
│   ├── buzz-anticipated.mp3
│   ├── correct-fanfare.mp3
│   ├── wrong-buzzer.mp3
│   └── timer-warning.mp3
├── victory/                 # Sons de victoire
│   ├── podium-1st.mp3
│   ├── podium-2nd.mp3
│   ├── podium-3rd.mp3
│   └── end-celebration.mp3
└── ambiance/                # Musiques d'ambiance
    ├── lobby-music.mp3
    ├── game-tension.mp3
    └── applause.mp3
```

## 🎼 Où Trouver des Sons (Gratuits)

### 1. **Freesound.org** (Le meilleur pour les SFX)
🔗 https://freesound.org

**Recherches suggérées :**
- `button-click` : "ui click", "button press", "pop"
- `button-hover` : "ui hover", "soft beep"
- `swoosh-in` : "whoosh in", "swipe"
- `reveal-dramatic` : "dramatic reveal", "drum roll short"
- `buzz-alert` : "game show buzz", "buzzer", "alert"
- `correct-fanfare` : "success", "victory short", "correct answer"
- `wrong-buzzer` : "wrong answer", "fail", "error buzz"
- `applause` : "applause short", "crowd cheer"

### 2. **Zapsplat.com** (SFX professionnels)
🔗 https://www.zapsplat.com

Sections recommandées :
- "Game Sounds" → UI sounds
- "Cartoons & Comedy" → Game show sounds
- "Human Sounds" → Applause, cheers

### 3. **Mixkit.co** (Sons UI modernes)
🔗 https://mixkit.co/free-sound-effects/

Catégories :
- "UI Sounds" pour boutons et transitions
- "Game Sounds" pour buzzers et alertes

### 4. **Incompetech.com** (Musiques d'ambiance)
🔗 https://incompetech.com/music/

Pour les musiques de fond (lobby, game, victory)

## 🎯 Recommandations par Fichier

### UI (Interface)

**button-click.mp3** (court, ~0.1s)
- Son sec et satisfaisant
- Fréquence: moyenne-haute
- Exemple: "pop", "click"

**button-hover.mp3** (très court, ~0.05s)
- Son très subtil
- Volume faible recommandé
- Exemple: "soft beep", "tick"

### Game (Jeu)

**reveal-dramatic.mp3** (1-2s)
- Montée dramatique
- Style: drum roll court ou cymbal swell
- Doit capter l'attention

**buzz-alert.mp3** (0.5-1s)
- Son de buzzer classique
- Fort et distinctif
- Style: game show buzzer

**correct-fanfare.mp3** (1-2s)
- Son triomphal
- Style: fanfare courte, notes ascendantes
- Positif et encourageant

**wrong-buzzer.mp3** (0.5-1s)
- Son désagréable (mais pas trop)
- Fréquence basse
- Style: buzzer d'erreur

### Victory (Victoire)

**podium-1st.mp3** (2-3s)
- Le plus héroïque
- Fanfare complète
- Style: victoire épique

**podium-2nd.mp3** (1-2s)
- Positif mais moins intense que 1er
- Style: succès

**podium-3rd.mp3** (1-2s)
- Sympathique
- Style: accomplissement

**end-celebration.mp3** (3-5s)
- Festif
- Peut servir de musique de fond courte

### Ambiance (Musiques)

**lobby-music.mp3** (30s-1min, loop)
- Légère et décontractée
- Tempo modéré
- Doit pouvoir loop sans coupure

**game-tension.mp3** (optionnel)
- Musique de fond pendant le jeu
- Subtile, ne doit pas couvrir les autres sons
- Crée de la tension

**applause.mp3** (3-5s)
- Applaudissements de foule
- Pour célébrations

## ⚙️ Spécifications Techniques

### Format
- **Format:** MP3 (compatible tous navigateurs)
- **Bitrate:** 128-192 kbps (bon compromis qualité/taille)
- **Sample rate:** 44.1 kHz

### Durées Recommandées
- **UI:** 0.05-0.2s
- **Game SFX:** 0.5-2s
- **Victoires:** 1-3s
- **Musiques:** 30s-1min (loop)

### Volume
Normaliser tous les sons pour éviter des variations brutales :
- **UI:** -20 à -15 dB
- **Game:** -12 à -10 dB
- **Victory:** -10 à -8 dB
- **Musique:** -20 à -15 dB (background)

## 🛠️ Outils de Traitement

### Audacity (Gratuit)
🔗 https://www.audacityteam.org/

**Pour normaliser :**
1. Ouvrir le fichier
2. Effect → Normalize → OK
3. Export as MP3

**Pour couper :**
1. Sélectionner la partie à garder
2. Edit → Remove Audio → Trim Audio
3. Export

### Online Audio Converter
🔗 https://online-audio-converter.com/

Pour convertir en MP3 si nécessaire.

## 📋 Checklist d'Installation

Une fois les sons téléchargés, vérifiez :

- [ ] Tous les fichiers sont en `.mp3`
- [ ] Noms de fichiers exacts (vérifier les tirets)
- [ ] Fichiers placés dans les bons dossiers
- [ ] Volume normalisé (pas trop fort/faible)
- [ ] Tester dans l'app (les sons se chargent?)

## 🎮 Test des Sons

Pour tester si tout fonctionne :

1. Lancez l'app en dev : `npm run dev`
2. Allez sur une page avec des boutons
3. Ouvrez la console navigateur (F12)
4. Vérifiez qu'il n'y a pas d'erreurs de chargement audio
5. Testez les interactions (clic, hover, etc.)

## 🔇 Mode Silencieux

L'app fonctionne sans les sons ! Si un fichier n'est pas trouvé, un warning apparaîtra dans la console mais l'app continuera de fonctionner normalement.

---

**Note :** Tous les sons doivent être libres de droits ou sous licence Creative Commons (avec attribution si requise).

**Astuce :** Commencez avec les sons essentiels (buzz, correct, wrong) puis ajoutez progressivement les autres pour enrichir l'expérience.
