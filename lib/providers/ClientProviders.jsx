'use client';

import { useEffect } from 'react';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { ReviewPromptProvider } from '@/lib/contexts/ReviewPromptContext';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { AppShell } from '@/components/layout/AppShell';
import BrowserRedirect from '@/components/shared/BrowserRedirect';
import { prefetchManifests } from '@/lib/utils/manifestCache';

/**
 * ClientProviders - Wrapper pour tous les providers côté client
 * Inclut: ThemeProvider, ToastProvider, ErrorBoundary, AppShell
 */
export function ClientProviders({ children }) {
  // Prefetch manifests on app start
  useEffect(() => {
    prefetchManifests();
  }, []);

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
