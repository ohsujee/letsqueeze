# 📱 Gigglz Mobile - Guide Capacitor

## 🚀 Configuration

✅ **Capacitor est déjà installé et configuré !**

Les projets Android et iOS sont dans les dossiers `android/` et `ios/`.

---

## 🛠️ Développement

### **Workflow quotidien**

1. **Lancer le serveur de dev Next.js (comme d'habitude) :**
   ```bash
   npm run dev
   ```

2. **Ouvrir l'app sur émulateur/device :**

   **Android :**
   ```bash
   npx cap run android
   ```

   **iOS (Mac uniquement) :**
   ```bash
   npx cap run ios
   ```

3. **L'app mobile charge automatiquement depuis localhost:3000**
   - Vous modifiez votre code Next.js
   - Sauvegardez
   - L'app mobile se recharge automatiquement !

---

## 📦 Build & Publication

### **Pour tester en production (Vercel) :**

1. Modifiez `capacitor.config.ts` :
   ```typescript
   server: {
     url: 'https://votre-app.vercel.app', // Votre URL Vercel
     androidScheme: 'https'
   }
   ```

2. Synchronisez :
   ```bash
   npx cap sync
   ```

3. Ouvrez et buildez :
   ```bash
   npx cap open android  # ou ios
   ```
   Puis build depuis Android Studio / Xcode

---

## 🔄 Commandes utiles

```bash
# Synchroniser le code web vers mobile
npx cap sync

# Ouvrir Android Studio
npx cap open android

# Ouvrir Xcode (Mac uniquement)
npx cap open ios

# Mettre à jour les plugins Capacitor
npm update @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

---

## 📱 Prérequis

### **Android :**
- [Android Studio](https://developer.android.com/studio) installé
- SDK Android 21+ (Android 5.0+)

### **iOS (Mac uniquement) :**
- Xcode 15+ installé
- CocoaPods : `sudo gem install cocoapods`
- Compte Apple Developer (99€/an) pour publier sur App Store

---

## 🎯 Mode de fonctionnement actuel

**Mode : Serveur distant**

L'app mobile charge le contenu depuis votre serveur web :
- **Dev** : localhost:3000 (automatique)
- **Prod** : Changez l'URL dans `capacitor.config.ts`

**Avantages :**
- ✅ Pas de rebuild nécessaire pour chaque changement
- ✅ Mises à jour instantanées (comme une PWA)
- ✅ Fonctionne parfaitement avec Firebase
- ✅ Pas de problème avec les routes dynamiques Next.js

**Important :**
- L'app nécessite une connexion internet
- Parfait pour Gigglz (jeu multijoueur temps réel)

---

## 🚀 Prochaines étapes

1. **Tester sur émulateur :**
   ```bash
   npm run dev
   npx cap run android
   ```

2. **Configurer les icônes/splash screens :**
   - Placez vos images dans `android/app/src/main/res/`
   - Placez vos images dans `ios/App/App/Assets.xcassets/`

3. **Ajouter des plugins Capacitor si besoin :**
   ```bash
   npm install @capacitor/camera
   npm install @capacitor/push-notifications
   npx cap sync
   ```

4. **Publier sur les stores :**
   - Android : Google Play Console
   - iOS : App Store Connect

---

## 🐛 Dépannage

**"Could not connect to development server"**
→ Vérifiez que `npm run dev` tourne et que localhost:3000 est accessible

**"Unable to find Xcode"** (iOS)
→ Nécessite un Mac avec Xcode installé

**Build Android échoue**
→ Ouvrez Android Studio et laissez-le télécharger les dépendances

---

## 📚 Documentation

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Workflow Guide](https://capacitorjs.com/docs/basics/workflow)
- [Publishing Guide](https://capacitorjs.com/docs/guides/deploying-updates)
