'use client';

import BottomNav from '@/lib/components/BottomNav';
import PageTransition from '@/components/layout/PageTransition';

export default function MainLayout({ children }) {
  return (
    <div className="main-layout">
      <div className="main-content">
        <PageTransition>
          {children}
        </PageTransition>
      </div>
      <BottomNav />

      <style jsx>{`
        .main-layout {
          display: flex;
          flex-direction: column;
          min-height: 100%;
          min-height: 100dvh;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
      `}</style>
    </div>
  );
}
