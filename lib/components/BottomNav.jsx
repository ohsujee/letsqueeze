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
  );
}
