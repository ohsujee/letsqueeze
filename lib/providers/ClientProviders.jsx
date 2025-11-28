'use client';

import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

/**
 * ClientProviders - Wrapper pour tous les providers côté client
 * Inclut: ThemeProvider, ToastProvider, ErrorBoundary
 */
export function ClientProviders({ children }) {
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
