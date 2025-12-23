# Gigglz - Guide d'intégration RevenueCat

## Vue d'ensemble

RevenueCat simplifie la gestion des abonnements in-app pour iOS et Android. Il gère automatiquement:
- Les achats via App Store / Play Store
- Les renouvellements d'abonnement
- Les annulations et remboursements
- La restauration des achats
- Les analytics de revenus

---

## Étape 1: Créer les comptes

### 1.1 RevenueCat (Gratuit)
- [ ] Aller sur [revenuecat.com](https://www.revenuecat.com)
- [ ] Créer un compte
- [ ] Créer un nouveau projet "Gigglz"

### 1.2 Apple Developer Account (99€/an)
- [ ] Aller sur [developer.apple.com](https://developer.apple.com)
- [ ] S'inscrire au Apple Developer Program
- [ ] Attendre la validation (24-48h)

### 1.3 Google Play Developer Account (25€ une fois)
- [ ] Aller sur [play.google.com/console](https://play.google.com/console)
- [ ] Créer un compte développeur
- [ ] Payer les 25€ de frais d'inscription

---

## Étape 2: Configurer Apple App Store Connect

### 2.1 Créer l'app
- [ ] Aller sur [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- [ ] Apps → "+" → Nouvelle app
- [ ] Nom: "Gigglz"
- [ ] Bundle ID: `com.gigglz.app`
- [ ] SKU: `gigglz-app`

### 2.2 Créer les In-App Purchases
Aller dans l'app → Fonctionnalités → Achats intégrés → "+"

**Abonnement mensuel:**
- Type: Abonnement à renouvellement automatique
- Nom de référence: `Gigglz Pro Mensuel`
- Product ID: `gigglz_pro_monthly`
- Prix: 3,99€/mois
- Groupe d'abonnement: `Gigglz Pro`

**Abonnement annuel:**
- Type: Abonnement à renouvellement automatique
- Nom de référence: `Gigglz Pro Annuel`
- Product ID: `gigglz_pro_annual`
- Prix: 29,99€/an
- Groupe d'abonnement: `Gigglz Pro`

### 2.3 Récupérer le Shared Secret
- [ ] App Store Connect → Utilisateurs et accès → Clés → Clé d'abonnements intégrés
- [ ] Générer une nouvelle clé
- [ ] Copier le "App-Specific Shared Secret"

---

## Étape 3: Configurer Google Play Console

### 3.1 Créer l'app
- [ ] Aller sur [play.google.com/console](https://play.google.com/console)
- [ ] Créer une application
- [ ] Nom: "Gigglz"
- [ ] Package name: `com.gigglz.app`

### 3.2 Créer les abonnements
Aller dans Monétisation → Produits → Abonnements → Créer un abonnement

**Abonnement mensuel:**
- Product ID: `gigglz_pro_monthly`
- Nom: Gigglz Pro Mensuel
- Prix: 3,99€/mois

**Abonnement annuel:**
- Product ID: `gigglz_pro_annual`
- Nom: Gigglz Pro Annuel
- Prix: 29,99€/an

### 3.3 Créer un Service Account
- [ ] Google Cloud Console → IAM → Comptes de service
- [ ] Créer un compte de service
- [ ] Télécharger le fichier JSON
- [ ] Lier le compte à Play Console (Utilisateurs et autorisations)

---

## Étape 4: Configurer RevenueCat

### 4.1 Connecter Apple
- [ ] RevenueCat Dashboard → Projet Gigglz → iOS App
- [ ] Entrer le Bundle ID: `com.gigglz.app`
- [ ] Coller le App-Specific Shared Secret

### 4.2 Connecter Google
- [ ] RevenueCat Dashboard → Projet Gigglz → Android App
- [ ] Entrer le Package Name: `com.gigglz.app`
- [ ] Uploader le fichier JSON du Service Account

### 4.3 Créer les Entitlements
- [ ] RevenueCat → Entitlements → "+"
- [ ] Nom: `pro`
- [ ] Description: Accès Pro complet

### 4.4 Créer les Offerings
- [ ] RevenueCat → Offerings → "+"
- [ ] Identifier: `default`
- [ ] Ajouter les 2 packages (monthly, annual)
- [ ] Lier à l'entitlement "pro"

### 4.5 Récupérer les API Keys
- [ ] RevenueCat → Projet → API Keys
- [ ] Copier la **Public API Key** (commence par `appl_` ou `goog_`)

---

## Étape 5: Intégration dans le code

### 5.1 Installer le package
```bash
npm install @revenuecat/purchases-capacitor
npx cap sync
```

### 5.2 Initialiser RevenueCat
```javascript
// lib/revenuecat.js
import { Purchases } from '@revenuecat/purchases-capacitor';

const REVENUECAT_API_KEY = {
  ios: 'appl_xxxxxxxx',
  android: 'goog_xxxxxxxx'
};

export async function initRevenueCat(userId) {
  await Purchases.configure({
    apiKey: Platform.OS === 'ios'
      ? REVENUECAT_API_KEY.ios
      : REVENUECAT_API_KEY.android,
    appUserID: userId
  });
}
```

### 5.3 Vérifier l'abonnement
```javascript
export async function checkSubscription() {
  const { customerInfo } = await Purchases.getCustomerInfo();
  return customerInfo.entitlements.active['pro'] !== undefined;
}
```

### 5.4 Acheter un abonnement
```javascript
export async function purchasePackage(packageId) {
  try {
    const offerings = await Purchases.getOfferings();
    const package = offerings.current.availablePackages
      .find(p => p.identifier === packageId);

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: package });
    return customerInfo.entitlements.active['pro'] !== undefined;
  } catch (error) {
    console.error('Purchase failed:', error);
    return false;
  }
}
```

---

## Étape 6: Mettre à jour Firebase

Quand un achat est fait, mettre à jour le profil utilisateur:

```javascript
// Après un achat réussi
await updateDoc(doc(db, 'users', userId), {
  subscription: {
    tier: 'pro',
    provider: 'revenuecat',
    expiresAt: customerInfo.latestExpirationDate,
    productId: customerInfo.activeSubscriptions[0]
  }
});
```

---

## Produits à créer

| Product ID | Nom | Prix | Durée |
|------------|-----|------|-------|
| `gigglz_pro_monthly` | Gigglz Pro Mensuel | 3,99€ | 1 mois |
| `gigglz_pro_annual` | Gigglz Pro Annuel | 29,99€ | 1 an |

---

## Checklist finale

- [ ] Compte RevenueCat créé
- [ ] Compte Apple Developer actif
- [ ] Compte Google Play Developer actif
- [ ] App créée dans App Store Connect
- [ ] App créée dans Google Play Console
- [ ] In-App Purchases créés (iOS)
- [ ] Subscriptions créés (Android)
- [ ] RevenueCat connecté à Apple
- [ ] RevenueCat connecté à Google
- [ ] API Keys récupérées
- [ ] SDK installé dans le projet
- [ ] Page /subscribe connectée à RevenueCat
- [ ] Firebase mis à jour après achat

---

## Ressources

- [Documentation RevenueCat](https://docs.revenuecat.com/)
- [Guide Capacitor RevenueCat](https://docs.revenuecat.com/docs/capacitor)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
