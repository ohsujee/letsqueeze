'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, LayoutGroup } from 'framer-motion';
import { House, DoorOpen, User } from '@phosphor-icons/react';

const tabs = [
  { id: 'home',    label: 'Accueil',   Icon: House,      path: '/home' },
  { id: 'join',    label: 'Rejoindre', Icon: DoorOpen,   path: '/join' },
  { id: 'profile', label: 'Profil',    Icon: User,       path: '/profile' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const activeIndex = tabs.findIndex(tab => pathname === tab.path || pathname?.startsWith(tab.path + '/'));

  return (
    <LayoutGroup>
      <nav className="bottom-nav">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          const { Icon } = tab;

          return (
            <Link
              key={tab.id}
              href={tab.path}
              className={`nav-tab ${isActive ? 'active' : ''}`}
              prefetch={true}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            >
              {isActive && (
                <motion.div
                  className="nav-pill"
                  layoutId="nav-pill-indicator"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <div className="nav-icon-wrapper">
                <Icon weight={isActive ? 'fill' : 'regular'} size={24} />
              </div>
              <span className="tab-label">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
