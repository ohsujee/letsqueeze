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

  return (
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
  );
}
