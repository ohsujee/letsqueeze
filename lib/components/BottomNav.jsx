'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, User, Link2 } from 'lucide-react';

export default function BottomNav() {
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
          <Link
            key={tab.id}
            href={tab.path}
            className={`nav-tab ${isActive ? 'active' : ''}`}
            prefetch={true}
          >
            <TabIcon className="tab-icon" size={24} strokeWidth={2} />
            <span className="tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
