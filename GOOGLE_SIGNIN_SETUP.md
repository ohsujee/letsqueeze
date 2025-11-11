# 🔐 Configuration Google Sign-In

## 📋 Guide Complet

Ce guide explique comment activer Google Sign-In dans Firebase pour que tu puisses te connecter avec ton compte Google **yogarajah.sujeevan@gmail.com** et avoir automatiquement l'accès admin Pro.

---

## ✅ Ce Qui Est Déjà Configuré

✅ **Code côté client** - La page de connexion `/login` est prête
✅ **Firebase SDK** - Les fonctions Google Sign-In sont implémentées
✅ **Système Admin** - Ton email est dans la whitelist admin
✅ **Détection automatique** - Tu seras reconnu comme admin dès la connexion

---

## 🚀 Étapes de Configuration Firebase

### **1. Accéder à Firebase Console**

1. Va sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionne ton projet **"letsqueeze"**

---

### **2. Activer Google Sign-In**

1. Dans le menu de gauche, clique sur **"Authentication"** (🔐 Authentification)

2. Clique sur l'onglet **"Sign-in method"** (Méthode de connexion)

3. Dans la liste des providers, trouve **"Google"**

4. Clique sur **"Google"** pour l'éditer

5. **Active le provider** en cliquant sur le toggle switch

6. Configure les informations :
   - **Project support email** : yogarajah.sujeevan@gmail.com
   - **Project public-facing name** : LetsQueeze

7. Clique sur **"Save"** (Enregistrer)

---

### **3. Vérifier la Configuration**

1. Retourne sur l'onglet **"Sign-in method"**
2. Tu devrais voir **Google** avec le statut **"Enabled"** (Activé) ✅

---

## 🧪 Test de Connexion

### **1. Lancer l'Application**

```bash
npm run dev
```

### **2. Accéder à la Page de Connexion**

Ouvre ton navigateur :
```
http://localhost:3000/login
```

### **3. Se Connecter avec Google**

1. Clique sur **"Continuer avec Google"**
2. Sélectionne ton compte **yogarajah.sujeevan@gmail.com**
3. Autorise l'application

### **4. Vérifier l'Accès Admin**

Une fois connecté, tu devrais voir :

✅ **Badge Admin** : 👑 Admin Account - Full Pro Access
✅ **Badge Pro** : ⭐ PRO
✅ **Ton email** : yogarajah.sujeevan@gmail.com
✅ **Ton UID** : (généré automatiquement par Firebase)

---

## 🎯 Ce Que Ça Te Donne

Maintenant que tu es connecté avec Google et identifié comme admin :

### **Accès Illimité Automatique**

✅ Tous les quiz packs déverrouillés
✅ Tous les scénarios alibi déverrouillés
✅ Aucune limite de parties par jour
✅ Aucun paywall
✅ Tous les badges Pro/Admin affichés

### **Dans le Code**

```javascript
// Dans n'importe quel composant
import { useSubscription } from '@/lib/hooks/useSubscription';

function MyComponent() {
  const { isPro, isAdmin, adminStatus } = useSubscription(user);

  console.log(isPro);    // true
  console.log(isAdmin);  // true
  console.log(adminStatus); // "👑 Admin Account - Full Pro Access"
}
```

---

## 🔧 Détails Techniques

### **Comment Ça Marche**

1. **Tu te connectes** avec Google → Firebase Auth créé un user avec ton email
2. **Le système admin** vérifie ton email dans `lib/admin.js`
3. **Match trouvé** : `yogarajah.sujeevan@gmail.com` est dans `ADMIN_EMAILS`
4. **Statut Pro automatique** : `isPro(user)` retourne `true` grâce au bypass admin
5. **Tous les checks freemium** sont bypassés pour toi

### **Code Admin (lib/admin.js)**

```javascript
const ADMIN_EMAILS = [
  'yogarajah.sujeevan@gmail.com', // Ton compte
];

export const isAdmin = (user) => {
  // Check email
  return user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
};
```

### **Code Subscription (lib/subscription.js)**

```javascript
export const isPro = (user) => {
  // Admin bypass - retourne true immédiatement
  if (isAdmin(user)) {
    return true;
  }

  // Sinon, check subscription normale
  return user.subscription?.tier === 'pro';
};
```

---

## 📱 Pour Mobile (Capacitor)

Le Google Sign-In fonctionne aussi sur mobile ! Mais il faut configurer quelques trucs supplémentaires.

### **Android**

1. Dans Firebase Console :
   - Va dans **Project Settings** → **General**
   - Télécharge le fichier **google-services.json**
   - Place-le dans `android/app/google-services.json`

2. Ajoute ton SHA-1 fingerprint :
   ```bash
   cd android
   ./gradlew signingReport
   ```
   Copie le SHA-1 et ajoute-le dans Firebase Console

### **iOS**

1. Dans Firebase Console :
   - Va dans **Project Settings** → **General**
   - Télécharge le fichier **GoogleService-Info.plist**
   - Place-le dans `ios/App/App/GoogleService-Info.plist`

2. Ouvre `ios/App/App/Info.plist` et ajoute :
   ```xml
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleURLSchemes</key>
       <array>
         <string>com.googleusercontent.apps.YOUR-CLIENT-ID</string>
       </array>
     </dict>
   </array>
   ```

---

## 🐛 Dépannage

### **"popup_closed_by_user"**
→ L'utilisateur a fermé la popup avant de se connecter. Normal.

### **"auth/popup-blocked"**
→ Le navigateur bloque les popups. Autorise les popups ou utilise la méthode redirect :
```javascript
import { signInWithGoogleRedirect } from '@/lib/firebase';
await signInWithGoogleRedirect();
```

### **"auth/unauthorized-domain"**
→ Ajoute ton domaine dans Firebase Console :
1. **Authentication** → **Settings** → **Authorized domains**
2. Ajoute `localhost` (déjà présent normalement)
3. Ajoute ton domaine Vercel quand tu déploies

### **"Admin badge ne s'affiche pas"**
→ Vérifie :
1. Tu es bien connecté avec **yogarajah.sujeevan@gmail.com**
2. `user.email` contient bien cet email (check dans console)
3. Redémarre le serveur dev (`npm run dev`)

---

## 🎨 Personnalisation de la Page Login

La page `/login` est déjà stylée avec le design LetsQueeze. Tu peux la personnaliser dans :

```
app/login/page.jsx
```

Fonctionnalités actuelles :
- ✅ Bouton Google avec logo officiel
- ✅ Connexion anonyme (mode invité)
- ✅ Affichage des badges Admin/Pro
- ✅ Photo de profil Google
- ✅ Détails du compte (UID, email)
- ✅ Redirection vers l'accueil après connexion

---

## 🔒 Sécurité

### **Important**

- ✅ L'email admin est côté client (pas de problème pour le dev)
- ⚠️ Pour la production, considère déplacer la liste admin côté serveur
- ⚠️ Ou utilise Firebase Custom Claims pour les admins

### **Firebase Custom Claims (Avancé)**

Pour plus de sécurité en production :

```javascript
// Firebase Admin SDK (côté serveur)
admin.auth().setCustomUserClaims(uid, { admin: true });

// Côté client
const token = await user.getIdTokenResult();
if (token.claims.admin) {
  // User is admin
}
```

Mais pour le développement, la liste email est parfaite !

---

## 📚 Fichiers Modifiés

1. **lib/firebase.js** - Ajout Google Sign-In functions
2. **lib/admin.js** - Support email + UID
3. **lib/subscription.js** - Admin bypass avec email
4. **lib/hooks/useSubscription.js** - Hook pour React
5. **app/login/page.jsx** - Page de connexion

---

## ✅ Checklist Finale

- [ ] Google Sign-In activé dans Firebase Console
- [ ] Email support configuré
- [ ] Test connexion sur `localhost:3000/login`
- [ ] Connexion avec yogarajah.sujeevan@gmail.com
- [ ] Badge "👑 Admin Account - Full Pro Access" visible
- [ ] Badge "⭐ PRO" visible
- [ ] Accès à tous les packs quiz/alibi
- [ ] Aucune limite de jeu

---

Maintenant tu peux te connecter avec Google et profiter de l'accès admin complet ! 🎉

Besoin d'aide ? Vérifie la section Dépannage ci-dessus.
