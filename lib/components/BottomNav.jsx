'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, User, Link2 } from 'lucide-react';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    {
      id: 'home',
      label: 'Accueil',
      Icon: Home,
      path: '/home',
    },
    {
      id: 'join',
      label: 'Rejoindre',
      Icon: Link2,
      path: '/join',
    },
    {
      id: 'profile',
      label: 'Profil',
      Icon: User,
      path: '/profile',
    },
  ];

  return (
    <>
      {/* Bottom Navigation 2025 */}
      <nav className="bottom-nav">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;
          const TabIcon = tab.Icon;

          return (
            <button
              key={tab.id}
              className={`nav-tab ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (tab.path) {
                  router.push(tab.path);
                }
              }}
            >
              <TabIcon className="tab-icon" size={24} strokeWidth={2} />
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <style jsx>{`
        /* Bottom Nav 2025 - Glassmorphism Dark */
        .bottom-nav {
          position: fixed;
          bottom: 16px;
          left: 16px;
          right: 16px;
          height: 64px;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 0 var(--space-2);
          z-index: var(--z-fixed);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.6),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .nav-tab {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          padding: var(--space-2) var(--space-3);
          min-height: 56px;
          min-width: 64px;
          flex: 1;
          color: rgba(255, 255, 255, 0.6);
          position: relative;
        }

        .nav-tab::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .nav-tab:hover::before {
          opacity: 1;
        }

        .nav-tab:hover {
          color: rgba(255, 255, 255, 0.9);
        }

        .nav-tab:active {
          transform: scale(0.9);
        }

        .nav-tab.active {
          color: var(--brand-electric);
        }

        .nav-tab.active::before {
          background: rgba(66, 153, 225, 0.15);
          opacity: 1;
        }

        .nav-tab :global(.tab-icon) {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .nav-tab.active :global(.tab-icon) {
          transform: translateY(-2px);
          filter: drop-shadow(0 0 12px var(--glow-electric));
        }

        .tab-label {
          font-size: 11px;
          font-weight: var(--font-weight-semibold);
          letter-spacing: 0.02em;
        }

        /* Safe area for notch */
        @supports (padding: max(0px)) {
          .bottom-nav {
            bottom: max(16px, calc(16px + env(safe-area-inset-bottom)));
          }
        }

        /* Mobile adjustments */
        @media (max-width: 640px) {
          .tab-label {
            font-size: 10px;
          }

          .nav-tab {
            padding: var(--space-1) var(--space-2);
          }
        }
      `}</style>
    </>
  );
}
