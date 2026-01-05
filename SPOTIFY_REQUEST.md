# Demande Spotify Extended Quota - Gigglz

> **Statut:** A soumettre
> **Dashboard:** https://developer.spotify.com/dashboard
> **Chemin:** Ton app → Settings → Request Extension

---

## 1. App Description (Short)

```
Gigglz is a multiplayer party game app featuring a music Blind Test mode
powered by Spotify. Players compete to identify songs from curated playlists
in real-time using the Web Playback SDK.
```

---

## 2. App Description (Detailed)

```
Gigglz is a social party game application developed by Agence ÜMAIN,
a French digital agency. The app offers multiple game modes including
Quiz, Alibi (social deduction), Mime, and our flagship feature:
the Spotify-powered Blind Test.

HOW SPOTIFY IS USED:
- Players connect their Spotify Premium account via OAuth (PKCE flow)
- The Web Playback SDK streams 30-second song previews during gameplay
- Players compete to identify the song title and artist as fast as possible
- We use curated public playlists organized by genre/decade/theme

TECHNICAL IMPLEMENTATION:
- Web Playback SDK for audio streaming
- Secure token storage in httpOnly cookies
- No permanent storage of user listening data
- Full compliance with Spotify Branding Guidelines

TARGET AUDIENCE:
- Friends and families gathering for game nights
- Party hosts looking for interactive entertainment
- Age 13+ (as per our Terms of Service)

BUSINESS MODEL:
- Freemium model with optional Pro subscription
- Pro unlocks unlimited games and additional content packs
- Subscriptions handled via App Store / Play Store (RevenueCat)
- No monetization of Spotify data

CURRENT STATUS:
- Fully functional web app deployed on Vercel
- Mobile apps (iOS/Android) via Capacitor in development
- Privacy Policy and Terms of Service published
- Ready for public beta launch pending Spotify extended access
```

---

## 3. Additional Information / Argumentaire

```
WHY WE NEED EXTENDED ACCESS:

We are a registered French company (Agence ÜMAIN, SIRET: 989 982 913 00018)
launching a party game app where the Blind Test feature is central to our
value proposition.

Our challenge: We cannot grow beyond 25 users in development mode, which
prevents us from conducting a proper public beta and building the user base
required by standard quota criteria.

WHAT MAKES US A GOOD CANDIDATE:

1. LEGITIMATE BUSINESS USE
   - Registered company with professional infrastructure
   - Clear monetization through subscriptions (not Spotify data)
   - Legal pages published (Privacy Policy, Terms of Service)

2. TECHNICAL COMPLIANCE
   - Using Web Playback SDK as intended
   - PKCE OAuth flow with secure token handling
   - No scraping, no data harvesting, no playlist manipulation

3. POSITIVE FOR SPOTIFY ECOSYSTEM
   - Encourages Spotify Premium subscriptions (required for playback)
   - Introduces Spotify to new users through gaming
   - Showcases Spotify's SDK capabilities in entertainment

4. RESPONSIBLE GROWTH PLAN
   - Starting with French market
   - Gradual expansion based on user feedback
   - Committed to Spotify Developer Terms long-term

We understand Spotify prioritizes established apps, but we respectfully
request consideration as an early-stage startup with a compliant,
creative use case that benefits the Spotify ecosystem.

Contact: contact@weareumain.com
Website: [YOUR_VERCEL_URL]
Privacy Policy: [YOUR_VERCEL_URL]/privacy
Terms of Service: [YOUR_VERCEL_URL]/terms
```

---

## 4. Informations Entreprise

| Champ | Valeur |
|-------|--------|
| **Nom societe** | Agence ÜMAIN |
| **SIRET** | 989 982 913 00018 |
| **Email contact** | contact@weareumain.com |
| **Pays** | France |
| **Website** | [A COMPLETER] |
| **Privacy Policy URL** | [URL]/privacy |
| **Terms of Service URL** | [URL]/terms |

---

## 5. Screenshots a preparer

| # | Screenshot | Description |
|---|------------|-------------|
| 1 | **Connexion Spotify** | Ecran demandant de connecter Spotify avec le bouton vert |
| 2 | **OAuth Spotify** | La page d'autorisation Spotify (avec ton logo visible) |
| 3 | **Blind Test Lobby** | La room d'attente avant de lancer une partie |
| 4 | **Gameplay actif** | Pendant une manche avec le player Spotify visible |
| 5 | **Resultats** | Ecran de fin avec les scores |
| 6 | **Page d'accueil** | Vue d'ensemble de l'app avec les differents jeux |

### Tips pour les screenshots
- Resolution haute (1280x720 minimum)
- Mode clair si possible (plus lisible)
- Masquer les infos perso (email, etc.)
- Montrer le logo Spotify clairement visible

---

## 6. Checklist avant soumission

- [ ] Deployer la derniere version sur Vercel
- [ ] Verifier que `/privacy` est accessible
- [ ] Verifier que `/terms` est accessible
- [ ] Prendre les 6 screenshots
- [ ] Remplacer [YOUR_VERCEL_URL] par l'URL reelle
- [ ] Verifier que contact@weareumain.com fonctionne
- [ ] Aller sur Spotify Dashboard → App → Settings → Request Extension
- [ ] Soumettre la demande

---

## 7. Apres soumission

- Delai de reponse : jusqu'a 6 semaines
- Reponse envoyee a l'email du compte Spotify Developer
- Si refuse : possibilite de re-soumettre avec plus d'infos
- Si accepte : extended quota active automatiquement

---

## 8. Plan B (si refuse)

1. **Rester en Dev Mode** - Limiter la beta a 25 testeurs
2. **Contacter Spotify Support** - Demander une exception startup
3. **Alternative technique** - Utiliser les previews 30s sans Web Playback SDK (qualite reduite)
4. **Attendre** - Accumuler des utilisateurs sur les autres jeux, re-demander plus tard

---

**Derniere mise a jour:** Janvier 2025
