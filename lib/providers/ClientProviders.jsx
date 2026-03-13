'use client';

import { useEffect } from 'react';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { ReviewPromptProvider } from '@/lib/contexts/ReviewPromptContext';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { AppShell } from '@/components/layout/AppShell';
import BrowserRedirect from '@/components/shared/BrowserRedirect';
import { prefetchManifests } from '@/lib/utils/manifestCache';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';
import { useForceUpdate } from '@/lib/hooks/useForceUpdate';
import { ForceUpdateModal } from '@/components/shared/ForceUpdateModal';
import { useGlobalPresence } from '@/lib/hooks/useGlobalPresence';
import { useAppTracking } from '@/lib/hooks/useAppTracking';

/**
 * ClientProviders - Wrapper pour tous les providers côté client
 * Inclut: ThemeProvider, ToastProvider, ErrorBoundary, AppShell
 */
export function ClientProviders({ children }) {
  // Prefetch manifests on app start
  useEffect(() => {
    prefetchManifests();
  }, []);

  // Push notifications natives (iOS + Android)
  usePushNotifications();

  // Tracking version/plateforme pour tous les users natifs authentifiés
  useAppTracking();

  // Présence globale — écrit presence/{uid} dans Firebase RTDB
  useGlobalPresence();

  // Force update si version < config/forceUpdateVersion dans Firebase
  const { forceUpdate } = useForceUpdate();

  return (
    <>
    {forceUpdate && <ForceUpdateModal />}
    <ErrorBoundary>
      <BrowserRedirect />
      <AppShell>
        <ThemeProvider>
          <ToastProvider>
            <ReviewPromptProvider>
              {children}
            </ReviewPromptProvider>
          </ToastProvider>
        </ThemeProvider>
      </AppShell>
    </ErrorBoundary>
    </>
  );
}
