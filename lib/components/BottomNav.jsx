'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, LayoutGroup } from 'framer-motion';

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
        d="M3 10.5V21C3 21.5523 3.44772 22 4 22H9V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V22H20C20.5523 22 21 21.5523 21 21V10.5L12 3L3 10.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

const LinkIcon = ({ filled }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10 13C10.4295 13.5741 10.9774 14.0491 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9403 15.7513 14.6897C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59695 21.9548 8.33394 21.9434 7.02296C21.932 5.71198 21.4061 4.45791 20.479 3.53087C19.552 2.60383 18.2979 2.07799 16.987 2.0666C15.676 2.0552 14.413 2.55918 13.47 3.46997L11.75 5.17997"
      stroke="currentColor"
      strokeWidth={filled ? "3" : "1.5"}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 11C13.5705 10.4259 13.0226 9.95083 12.3934 9.60706C11.7642 9.26329 11.0685 9.05886 10.3533 9.00765C9.63816 8.95643 8.92037 9.05963 8.24861 9.3102C7.57685 9.56077 6.96684 9.95296 6.45996 10.46L3.45996 13.46C2.54917 14.403 2.04519 15.666 2.05659 16.977C2.06798 18.288 2.59382 19.5421 3.52086 20.4691C4.4479 21.3961 5.70197 21.922 7.01295 21.9334C8.32393 21.9448 9.58694 21.4408 10.53 20.53L12.24 18.82"
      stroke="currentColor"
      strokeWidth={filled ? "3" : "1.5"}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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
      Icon: LinkIcon,
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
    <LayoutGroup>
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
              {/* Sliding pill indicator - rendered in each tab but shared via layoutId */}
              {isActive && (
                <motion.div
                  className="nav-pill"
                  layoutId="nav-pill-indicator"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 35,
                  }}
                />
              )}

              <div className="nav-icon-wrapper">
                <TabIcon filled={isActive} />
              </div>

              <span className="tab-label">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
