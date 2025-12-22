'use client';

import { useEffect } from 'react';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { prefetchManifests } from '@/lib/utils/manifestCache';

/**
 * ClientProviders - Wrapper pour tous les providers côté client
 * Inclut: ThemeProvider, ToastProvider, ErrorBoundary
 */
export function ClientProviders({ children }) {
  // Prefetch manifests on app start
  useEffect(() => {
    prefetchManifests();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
