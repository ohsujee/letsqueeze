# Configuration

Configuration centralisée de tous les jeux.

## Fichiers

### `games.js` - Catalogue des jeux
Définit tous les jeux disponibles dans l'app :
```javascript
{
  id: 'quiz',           // Identifiant unique
  name: 'Quiz Buzzer',  // Nom affiché
  emoji: '🎯',
  local: false,         // true = pas de Firebase
  available: true,      // false = non accessible
  comingSoon: false,    // true = badge "À venir"
  foundersOnly: false,  // true = réservé aux fondateurs
  releaseDate: null,    // ISO date pour countdown
  themeColor: '#8b5cf6'
}
```

### `rooms.js` - Configuration Firebase par jeu
Définit les préfixes Firebase et schémas joueurs :
```javascript
ROOM_TYPES = {
  quiz: { prefix: 'rooms', playerSchema: {...} },
  blindtest: { prefix: 'rooms_blindtest', playerSchema: {...} },
  deeztest: { prefix: 'rooms_deeztest', playerSchema: {...} },
  alibi: { prefix: 'rooms_alibi', playerSchema: {...} },
  laloi: { prefix: 'rooms_laloi', playerSchema: {...} }
}
```

## Ajouter un nouveau jeu

1. **`games.js`** - Ajouter l'entrée dans le tableau `GAMES`
2. **`rooms.js`** - Ajouter le type de room avec son préfixe Firebase
3. **`firebase.rules.json`** - Ajouter les règles de sécurité
4. **`app/{game}/`** - Créer les pages (room, play, host, end)

## Préfixes Firebase

| Jeu | Préfixe |
|-----|---------|
| Quiz | `rooms/` |
| BlindTest | `rooms_blindtest/` |
| DeezTest | `rooms_deeztest/` |
| Alibi | `rooms_alibi/` |
| TrouveRègle | `rooms_laloi/` |
