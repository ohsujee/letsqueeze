# Blind Test - Spécifications Techniques

## Vue d'ensemble

Jeu musical basé sur l'architecture Quiz Buzzer. L'hôte (Spotify Premium) joue des extraits de chansons, les joueurs buzzent pour deviner l'artiste/titre.

---

## 1. Prérequis Spotify

### API & SDK utilisés
- **Web Playback SDK** : Lecteur Spotify dans le navigateur (requiert Premium)
- **Web API** : Recherche playlists, métadonnées, contrôle lecture

### Scopes OAuth requis
```
streaming
user-read-playback-state
user-modify-playback-state
user-read-currently-playing
playlist-read-private
playlist-read-collaborative
```

### Limitations
- **Premium obligatoire** pour l'hôte (Web Playback SDK)
- Safari iOS : restrictions autoplay (gérer manuellement)
- Preview URLs (30s) disponibles sans Premium mais qualité limitée

**Sources :**
- [Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)
- [Getting Started](https://developer.spotify.com/documentation/web-playback-sdk/tutorials/getting-started)

---

## 2. Structure Firebase

```
rooms_blindtest/{code}/
├── meta/
│   ├── code: string
│   ├── createdAt: number
│   ├── hostUid: string
│   ├── expiresAt: number
│   ├── mode: "individuel" | "équipes"
│   ├── teamCount: number
│   ├── teams: { team1: { name, color, score }, ... }
│   ├── spotifyConnected: boolean
│   ├── playlistId: string (Spotify playlist ID)
│   ├── playlistName: string
│   ├── playlistImage: string
│   └── closed: boolean
│
├── state/
│   ├── phase: "lobby" | "playing" | "ended"
│   ├── currentIndex: number
│   ├── revealed: boolean (chanson en cours de lecture)
│   ├── snippetLevel: 0 | 1 | 2 | 3 (1s, 3s, 10s, full)
│   ├── lockUid: string | null
│   ├── buzzBanner: string
│   ├── lastRevealAt: number
│   ├── elapsedAcc: number
│   ├── pausedAt: number | null
│   └── lockedAt: number | null
│
├── playlist/
│   ├── id: string
│   ├── name: string
│   └── tracks: [
│       {
│         spotifyUri: string (spotify:track:xxx)
│         title: string
│         artist: string
│         album: string
│         albumArt: string (URL image)
│         durationMs: number
│         previewUrl: string | null (30s preview)
│       }
│     ]
│
└── players/
    └── {uid}/
        ├── uid: string
        ├── name: string
        ├── score: number
        ├── teamId: string
        ├── blockedUntil: number
        └── joinedAt: number
```

---

## 3. Flow du jeu

### 3.1 Lobby (Hôte)

```
┌─────────────────────────────────────────────────┐
│  BLIND TEST - Lobby                             │
├─────────────────────────────────────────────────┤
│                                                 │
│  [🔗 Connecter Spotify]  ← Si pas connecté      │
│                                                 │
│  OU (si connecté) :                             │
│                                                 │
│  🎵 Spotify connecté ✓                          │
│  ┌─────────────────────────────────────────┐   │
│  │ 🔍 Rechercher une playlist...           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Résultats :                                    │
│  ┌──────┬────────────────────────────────┐     │
│  │ 🎵   │ Top 50 France                  │     │
│  │      │ 50 titres • Spotify            │     │
│  └──────┴────────────────────────────────┘     │
│  ┌──────┬────────────────────────────────┐     │
│  │ 🎵   │ Années 80 Hits                 │     │
│  │      │ 100 titres • User              │     │
│  └──────┴────────────────────────────────┘     │
│                                                 │
│  Playlist sélectionnée :                        │
│  ╔══════════════════════════════════════════╗  │
│  ║ 🎵 Top 50 France                         ║  │
│  ║ 20 titres sélectionnés aléatoirement     ║  │
│  ╚══════════════════════════════════════════╝  │
│                                                 │
│  Joueurs (3) :                                  │
│  • Alice  • Bob  • Charlie                      │
│                                                 │
│  [        🎮 DÉMARRER        ]                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3.2 Joueurs Non-Pro (Sans Spotify)

Si l'hôte n'est pas Pro ou n'a pas Spotify Premium :
- Accès à **3 playlists prédéfinies** stockées localement
- Utilise les `previewUrl` Spotify (30s, basse qualité)
- Playlists suggérées : "Hits Français", "Années 2000", "Classiques Rock"

### 3.3 Gameplay (Hôte)

```
┌─────────────────────────────────────────────────┐
│  🎵 Chanson 5/20                                │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │         🎵 Album Art                    │   │
│  │                                          │   │
│  │    "Shape of You"                        │   │
│  │     Ed Sheeran                           │   │
│  │                                          │   │
│  │    ▶️ ━━━━━━━━●━━━━━━━━ 1:23 / 3:54     │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Extrait joué : 3 secondes                      │
│  Points disponibles : 150 pts                   │
│                                                 │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │  1 sec │ │  3 sec │ │ 10 sec │ │  Full  │   │
│  │ 200pts │ │ 150pts │ │ 100pts │ │  50pts │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│      ↑ Boutons pour jouer l'extrait             │
│                                                 │
│  🔔 Alice a buzzé !                             │
│  [ ❌ Faux ] [ ✓ Correct ]                      │
│                                                 │
├─────────────────────────────────────────────────┤
│  [Reset] [Passer] [Fin]                         │
└─────────────────────────────────────────────────┘
```

### 3.4 Gameplay (Joueur)

```
┌─────────────────────────────────────────────────┐
│  🎵 Chanson 5/20                    150 pts     │
├─────────────────────────────────────────────────┤
│                                                 │
│           🎵 Écoute bien...                     │
│                                                 │
│           ♪ ♫ ♪ ♫ ♪                            │
│         (Animation audio)                       │
│                                                 │
│                                                 │
│                                                 │
│         ┌─────────────────────┐                │
│         │                     │                │
│         │       BUZZER        │                │
│         │                     │                │
│         └─────────────────────┘                │
│                                                 │
│  Ton score : 450 pts                            │
│                                                 │
├─────────────────────────────────────────────────┤
│  Classement : 1. Bob (520) 2. Toi (450)        │
└─────────────────────────────────────────────────┘
```

---

## 4. Système de points

### Points par niveau d'extrait

| Niveau | Durée | Points départ | Points plancher |
|--------|-------|---------------|-----------------|
| 1      | 1 sec | 200           | 150             |
| 2      | 3 sec | 150           | 100             |
| 3      | 10 sec| 100           | 75              |
| 4      | Full  | 50            | 25              |

### Logique de décompte
- Points dégressifs dans chaque niveau (comme Quiz Buzzer)
- Quand l'hôte passe au niveau suivant, les points max baissent
- Pénalité mauvaise réponse : -25 pts + blocage 8s

### Configuration (`/public/config/scoring-blindtest.json`)
```json
{
  "levels": [
    { "duration": 1000, "start": 200, "floor": 150 },
    { "duration": 3000, "start": 150, "floor": 100 },
    { "duration": 10000, "start": 100, "floor": 75 },
    { "duration": null, "start": 50, "floor": 25 }
  ],
  "lockoutMs": 8000,
  "wrongAnswerPenalty": 25
}
```

---

## 5. Contrôle audio

### Actions hôte

| Action | Effet |
|--------|-------|
| **1 sec** | Joue 1 seconde depuis le début, puis pause |
| **3 sec** | Joue 3 secondes depuis le début, puis pause |
| **10 sec** | Joue 10 secondes depuis le début, puis pause |
| **Full** | Joue la chanson en continu |
| **Buzz reçu** | Pause automatique |
| **Faux** | Reprend au dernier niveau (1s, 3s, 10s) ou continue si Full |
| **Correct** | Passe à la chanson suivante |
| **Reset** | Annule le buzz, reprend la lecture |
| **Passer** | Chanson suivante sans points |

### Intégration Spotify Web Playback SDK

```javascript
// Initialisation du player
const player = new Spotify.Player({
  name: 'LetsQueeze Blind Test',
  getOAuthToken: cb => cb(accessToken),
  volume: 0.5
});

// Connexion
player.connect();

// Jouer un extrait
async function playSnippet(trackUri, durationMs) {
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ uris: [trackUri], position_ms: 0 })
  });

  if (durationMs) {
    setTimeout(() => player.pause(), durationMs);
  }
}

// Pause
player.pause();

// Resume
player.resume();
```

---

## 6. Authentification Spotify

### Flow OAuth 2.0 (PKCE recommandé)

```
1. Hôte clique "Connecter Spotify"
2. Redirect vers Spotify authorize
3. User accepte les permissions
4. Callback avec code
5. Échange code → access_token + refresh_token
6. Stockage sécurisé (httpOnly cookie ou session)
```

### Endpoints

```
Authorization: https://accounts.spotify.com/authorize
Token: https://accounts.spotify.com/api/token
```

### Vérification Premium

```javascript
const response = await fetch('https://api.spotify.com/v1/me', {
  headers: { Authorization: `Bearer ${accessToken}` }
});
const user = await response.json();

if (user.product !== 'premium') {
  // Afficher erreur : Premium requis
}
```

---

## 7. Structure des fichiers

```
app/
├── blindtest/
│   ├── room/[code]/
│   │   └── page.jsx          # Lobby hôte + joueurs
│   ├── game/[code]/
│   │   ├── host/
│   │   │   └── page.jsx      # Interface hôte (contrôles audio)
│   │   └── play/
│   │       └── page.jsx      # Interface joueur (buzzer)
│   ├── join/
│   │   └── page.jsx          # Rejoindre une partie
│   └── end/[code]/
│       └── page.jsx          # Écran de fin

components/
├── blindtest/
│   ├── SpotifyPlayer.jsx     # Wrapper Web Playback SDK
│   ├── PlaylistSearch.jsx    # Recherche playlists
│   ├── PlaylistCard.jsx      # Carte playlist
│   ├── TrackDisplay.jsx      # Affichage chanson (hôte)
│   ├── AudioVisualizer.jsx   # Animation audio (joueurs)
│   ├── SnippetControls.jsx   # Boutons 1s/3s/10s/Full
│   └── BlindTestBuzzer.jsx   # Buzzer adapté

lib/
├── spotify/
│   ├── auth.js               # OAuth flow
│   ├── api.js                # Appels API Spotify
│   ├── player.js             # Web Playback SDK wrapper
│   └── playlists.js          # Gestion playlists prédéfinies

public/
├── config/
│   └── scoring-blindtest.json
└── data/
    └── playlists/            # Playlists prédéfinies (non-Pro)
        ├── hits-francais.json
        ├── annees-2000.json
        └── classiques-rock.json
```

---

## 8. Playlists prédéfinies (Non-Pro)

Pour les hôtes sans Spotify Premium, 3 playlists avec `previewUrl` :

```json
// public/data/playlists/hits-francais.json
{
  "id": "hits-francais",
  "name": "Hits Français",
  "image": "/images/playlists/hits-francais.jpg",
  "tracks": [
    {
      "title": "Dernière danse",
      "artist": "Indila",
      "previewUrl": "https://p.scdn.co/mp3-preview/xxx",
      "albumArt": "https://i.scdn.co/image/xxx"
    },
    // ... 19 autres
  ]
}
```

**Note** : Les preview URLs expirent. Solution :
- Refresh périodique via script
- Ou utiliser l'API Spotify pour récupérer les previews au runtime

---

## 9. Étapes de développement

### Phase 1 : Infrastructure Spotify
- [ ] Créer app Spotify Developer Dashboard
- [ ] Implémenter OAuth flow (lib/spotify/auth.js)
- [ ] Wrapper Web Playback SDK (lib/spotify/player.js)
- [ ] API search playlists (lib/spotify/api.js)
- [ ] Vérification Premium

### Phase 2 : Lobby
- [ ] Créer structure Firebase rooms_blindtest
- [ ] Page lobby hôte (connexion Spotify, recherche playlist)
- [ ] Page lobby joueur (attente)
- [ ] Sélection playlist + shuffle 20 tracks

### Phase 3 : Gameplay Hôte
- [ ] Interface contrôle audio (1s/3s/10s/Full)
- [ ] Affichage chanson en cours (album art, titre, artiste)
- [ ] Modal validation (Faux/Correct)
- [ ] Gestion des niveaux de points

### Phase 4 : Gameplay Joueur
- [ ] Buzzer (réutiliser composant existant)
- [ ] Animation audio/visualizer
- [ ] Affichage points en temps réel
- [ ] Leaderboard

### Phase 5 : Fin de partie
- [ ] Écran résultats (podium, stats)
- [ ] Replay / Nouvelle partie

### Phase 6 : Mode Non-Pro
- [ ] Playlists prédéfinies
- [ ] Lecture via previewUrl (sans SDK)
- [ ] Limitation à 3 playlists

---

## 10. Points d'attention

### Sécurité
- Ne jamais exposer le Client Secret côté client
- Utiliser PKCE pour OAuth
- Tokens stockés en session/cookie httpOnly

### UX
- Précharger les chansons (buffering)
- Gérer les erreurs réseau Spotify
- Fallback si Spotify down

### Mobile
- Safari iOS : bouton play manuel requis (pas d'autoplay)
- Tester sur différents navigateurs

### Performance
- Limiter les listeners Firebase
- Cleanup des subscriptions Spotify
- Gestion mémoire audio

---

## 11. Variables d'environnement

```env
# .env.local
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=xxxxx
SPOTIFY_CLIENT_SECRET=xxxxx
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
```

---

## 12. Ressources

- [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)
- [Spotify Web API Reference](https://developer.spotify.com/documentation/web-api/reference)
- [OAuth PKCE Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Example React Player](https://github.com/spotify/spotify-web-playback-sdk-example)
