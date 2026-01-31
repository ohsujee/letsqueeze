'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Crown, ChevronsUp } from 'lucide-react';

export default function HomeHeader({
  displayName,
  avatarInitial,
  isPro
}) {
  const router = useRouter();

  return (
    <header className="home-header-modern">
      <div className="avatar-container">
        <div className="avatar-placeholder">
          {avatarInitial}
        </div>
        <div className="avatar-status"></div>
      </div>

      <h1 className="user-name">{displayName}</h1>

      <div className="header-actions">
        {isPro ? (
          <motion.div
            className="pro-badge-circle"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Membre Pro"
          >
            <Crown size={20} strokeWidth={2.5} />
          </motion.div>
        ) : (
          <motion.button
            className="upgrade-btn-circle"
            onClick={() => router.push('/subscribe')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Passer Pro"
          >
            <ChevronsUp size={20} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>
    </header>
  );
}
