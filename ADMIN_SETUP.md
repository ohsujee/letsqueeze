# 👑 Admin Account Setup - Full Pro Access

## 🎯 What is this?

This guide will help you set up your personal admin account that will **always have full Pro access** to all features, bypassing freemium restrictions during development.

---

## 📋 Step-by-Step Guide

### **1. Find Your Firebase UID**

You need your Firebase User ID (UID) to add yourself as an admin.

#### **Option A: Using Browser Console (Easiest)**

1. **Open your app in a browser:**
   ```
   http://localhost:3000
   ```

2. **Create or join any game room** (you need to be authenticated)

3. **Open DevTools Console:**
   - **Windows/Linux:** Press `F12` or `Ctrl + Shift + J`
   - **Mac:** Press `Cmd + Option + J`

4. **Run this command in the console:**
   ```javascript
   firebase.auth().currentUser?.uid
   ```

5. **Copy the UID** (it looks like: `"abc123xyz456def789ghi012jkl345mno678pqr901"`)

#### **Option B: From Firebase Console**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Users**
4. Find your user (anonymous or by email)
5. Click on the user to see their **UID**

---

### **2. Add Your UID to Admin List**

1. **Open the file:**
   ```
   lib/admin.js
   ```

2. **Find the `ADMIN_UIDS` array:**
   ```javascript
   const ADMIN_UIDS = [
     // Add your Firebase UIDs here
   ];
   ```

3. **Add your UID:**
   ```javascript
   const ADMIN_UIDS = [
     'YOUR_ACTUAL_UID_HERE', // Votre compte admin
   ];
   ```

4. **Save the file**

---

### **3. Restart Your Dev Server**

```bash
npm run dev
```

---

### **4. Verify Admin Access**

#### **Method 1: Check in Console**

1. Open DevTools Console
2. Run:
   ```javascript
   // Import and check
   import { isAdmin } from './lib/admin.js';
   isAdmin(firebase.auth().currentUser?.uid);
   // Should return: true
   ```

#### **Method 2: Visual Verification**

When you implement the UI components, you'll see:
- **👑 Admin Account - Full Pro Access** badge
- **⭐ PRO** badge
- No locked features
- No daily game limits

---

## 🔧 How the Admin System Works

### **Admin Bypass Logic**

The admin system works at the core subscription level:

```javascript
// lib/subscription.js
export const isPro = (user) => {
  // Admin bypass - always returns true for admins
  if (isAdmin(user.uid)) {
    return true;
  }

  // Normal subscription check
  return user.subscription?.tier === 'pro';
};
```

### **What You Get as Admin**

✅ **Unlimited Access:**
- All quiz packs unlocked
- All alibi scenarios unlocked
- No daily game limits
- No paywalls

✅ **Visual Indicators:**
- Admin badge in UI
- Pro badge automatically shown
- All locked features available

✅ **Perfect for Development:**
- Test Pro features without payment integration
- No restrictions during development
- Easy to add/remove team members

---

## 👥 Adding Multiple Admins

You can add multiple UIDs for your team:

```javascript
const ADMIN_UIDS = [
  'your_uid_here',           // You
  'teammate_uid_here',       // Teammate 1
  'another_teammate_uid',    // Teammate 2
];
```

---

## 🔒 Security Notes

### **Important:**

1. **Never commit real UIDs to public repos** if your repo is public
2. Consider using environment variables for production:
   ```javascript
   const ADMIN_UIDS = process.env.ADMIN_UIDS?.split(',') || [];
   ```

3. **This is a dev/admin bypass** - not a security feature
4. For production, implement proper role-based access control (RBAC) in Firebase

---

## 🧪 Testing the Admin System

### **Test Checklist:**

- [ ] Can access all quiz packs (not just first 3)
- [ ] Can access all alibi scenarios (not just first 3)
- [ ] No daily game limits shown
- [ ] Admin badge displays in UI
- [ ] Pro badge displays in UI
- [ ] No "Upgrade to Pro" prompts

### **Test Commands:**

```javascript
// In browser console
import { isPro, canAccessPack, canPlayGame } from './lib/subscription.js';

// Should all return true for admin
isPro(user);                              // true
canAccessPack(user, 'quiz', 10);         // true (pack 10 even if limit is 3)
canPlayGame(user, 'quiz', 999);          // true (even after 999 games)
```

---

## 📱 Using in Your Code

### **Example 1: Check in Component**

```javascript
import { useSubscription } from '@/lib/hooks/useSubscription';

function MyComponent() {
  const { isPro, isAdmin, adminStatus } = useSubscription(user);

  return (
    <div>
      {isAdmin && <p>{adminStatus}</p>}
      {isPro && <p>You have Pro access!</p>}
    </div>
  );
}
```

### **Example 2: Lock Feature for Non-Pro**

```javascript
import { isPro } from '@/lib/subscription';

function FeatureComponent({ user }) {
  if (!isPro(user)) {
    return <LockedFeature message="Pro feature" />;
  }

  return <PremiumFeature />;
}
```

### **Example 3: Show Pro Badge**

```javascript
import { ProBadge } from '@/lib/components/SubscriptionUI';

function Profile({ user }) {
  return (
    <div>
      <h1>Profile</h1>
      <ProBadge user={user} showAdmin={true} />
    </div>
  );
}
```

---

## 🚀 Next Steps

Once your admin account is set up:

1. ✅ Test all Pro features during development
2. ✅ Implement freemium UI (paywalls, locked packs)
3. ✅ Build subscription flow when ready
4. ✅ Add analytics tracking
5. ✅ Integrate payment provider (RevenueCat/Stripe)

---

## 🐛 Troubleshooting

### **"isAdmin is not a function"**
→ Make sure you've imported from the correct path:
```javascript
import { isAdmin } from '@/lib/admin';
```

### **"Still seeing locked features"**
→ Check:
1. Your UID is correctly added to `ADMIN_UIDS`
2. No typos in the UID
3. You've restarted the dev server
4. The user object has the correct UID

### **"Can't find my UID"**
→ Make sure:
1. You're logged in (created/joined a game)
2. Firebase is initialized
3. You're checking `firebase.auth().currentUser?.uid` in console

---

## 📚 Related Files

- **lib/admin.js** - Admin configuration
- **lib/subscription.js** - Subscription logic with admin bypass
- **lib/hooks/useSubscription.js** - React hooks for subscription
- **lib/components/SubscriptionUI.jsx** - UI components (badges, locks)
- **PRODUCT_STRATEGY.md** - Overall product roadmap

---

Enjoy your full Pro access! 👑
