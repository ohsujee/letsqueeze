import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { ref, set } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

/**
 * Gère les push notifications natives (iOS + Android).
 * - Demande la permission au premier lancement
 * - Récupère le token FCM et le sauvegarde dans Firebase (users/{uid}/fcmToken)
 * - Gère le deep link lors d'un tap sur une notification
 * - Seulement actif sur plateforme native (pas sur web)
 */
export function usePushNotifications() {
  const tokenRef = useRef(null);
  const listenersRef = useRef([]);
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let unsubAuth = null;

    const saveToken = async (token, user) => {
      if (!user || user.isAnonymous) return;
      try {
        await set(ref(db, `users/${user.uid}/fcmToken`), token);
        await set(ref(db, `users/${user.uid}/fcmTokenUpdatedAt`), Date.now());
      } catch {}
    };

    const init = async () => {
      let PushNotifications;
      try {
        const mod = await import('@capacitor/push-notifications');
        PushNotifications = mod.PushNotifications;
      } catch {
        return;
      }

      // Token reçu → sauvegarder dans Firebase
      const regHandle = await PushNotifications.addListener('registration', (token) => {
        tokenRef.current = token.value;
        saveToken(token.value, auth.currentUser);
      });
      listenersRef.current.push(regHandle);

      // Erreur d'enregistrement
      const errHandle = await PushNotifications.addListener('registrationError', (err) => {
        console.error('[Push] Registration error:', err);
      });
      listenersRef.current.push(errHandle);

      // Notification reçue en foreground (app ouverte)
      const fgHandle = await PushNotifications.addListener('pushNotificationReceived', (_notification) => {
        // TODO phase 3 : afficher une bannière in-app
      });
      listenersRef.current.push(fgHandle);

      // Tap sur une notification → deep link vers la route
      const tapHandle = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const route = action.notification.data?.route;
        if (route && typeof window !== 'undefined') {
          window.location.href = route;
        }
      });
      listenersRef.current.push(tapHandle);

      // Quand l'user se connecte → sauvegarder le token s'il existe déjà
      unsubAuth = onAuthStateChanged(auth, (user) => {
        if (user && !user.isAnonymous && tokenRef.current) {
          saveToken(tokenRef.current, user);
        }
      });

      // Vérifier / demander la permission
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt') {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive !== 'granted') return;

      // S'enregistrer auprès de FCM
      if (!registeredRef.current) {
        await PushNotifications.register();
        registeredRef.current = true;
      }
    };

    init();

    return () => {
      unsubAuth?.();
      listenersRef.current.forEach((h) => h.remove());
      listenersRef.current = [];
    };
  }, []);
}
