'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Custom icons - filled versions for active state
const HomeIcon = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {filled ? (
      <path
        d="M3 10.5V21C3 21.5523 3.44772 22 4 22H9V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V22H20C20.5523 22 21 21.5523 21 21V10.5L12 3L3 10.5Z"
        fill="currentColor"
      />
    ) : (
      <path
        d="M3 10.5V21C3 21.5523 3.44772 22 4 22H9V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V22H20C20.5523 22 21 21.5523 21 21V10.5M3 10.5L12 3L21 10.5M3 10.5L1 12M21 10.5L23 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

const JoinIcon = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {filled ? (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" fill="currentColor"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5" fill="currentColor"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5" fill="currentColor"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor"/>
      </>
    ) : (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
      </>
    )}
  </svg>
);

const ProfileIcon = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {filled ? (
      <>
        <circle cx="12" cy="8" r="4" fill="currentColor"/>
        <path d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V20Z" fill="currentColor"/>
      </>
    ) : (
      <>
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V20Z" stroke="currentColor" strokeWidth="2"/>
      </>
    )}
  </svg>
);

export default function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    {
      id: 'home',
      label: 'Accueil',
      Icon: HomeIcon,
      path: '/home',
    },
    {
      id: 'join',
      label: 'Rejoindre',
      Icon: JoinIcon,
      path: '/join',
    },
    {
      id: 'profile',
      label: 'Profil',
      Icon: ProfileIcon,
      path: '/profile',
    },
  ];

  const activeIndex = tabs.findIndex(tab => pathname === tab.path || pathname?.startsWith(tab.path + '/'));

  return (
    <nav className="bottom-nav">
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        const TabIcon = tab.Icon;

        return (
          <Link
            key={tab.id}
            href={tab.path}
            className={`nav-tab ${isActive ? 'active' : ''}`}
            prefetch={true}
          >
            {/* Sliding pill indicator */}
            {isActive && (
              <motion.div
                className="nav-pill"
                layoutId="navPill"
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}

            <motion.div
              className="nav-icon-wrapper"
              animate={{
                y: isActive ? -2 : 0,
                scale: isActive ? 1.1 : 1,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
            >
              <TabIcon filled={isActive} />
            </motion.div>

            <motion.span
              className="tab-label"
              animate={{
                opacity: isActive ? 1 : 0.6,
              }}
              transition={{ duration: 0.2 }}
            >
              {tab.label}
            </motion.span>
          </Link>
        );
      })}
    </nav>
  );
}
