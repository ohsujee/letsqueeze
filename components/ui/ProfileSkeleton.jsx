'use client';

import { motion } from 'framer-motion';

// Shimmer animation for skeleton elements
const shimmer = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: { repeat: Infinity, duration: 1.5, ease: 'linear' }
  }
};

const SkeletonBox = ({ width, height, className = '', style = {} }) => (
  <motion.div
    className={`skeleton-box ${className}`}
    variants={shimmer}
    initial="initial"
    animate="animate"
    style={{
      width,
      height,
      borderRadius: 8,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%)',
      backgroundSize: '200% 100%',
      ...style
    }}
  />
);

export default function ProfileSkeleton() {
  return (
    <div className="profile-skeleton">
      {/* Header with Avatar */}
      <div className="skeleton-header">
        <SkeletonBox
          width={100}
          height={100}
          style={{ borderRadius: '50%', marginBottom: 16 }}
        />
        <SkeletonBox width={140} height={28} style={{ marginBottom: 8 }} />
        <SkeletonBox width={180} height={16} />
      </div>

      {/* Subscription Card */}
      <div className="skeleton-card large">
        <div className="skeleton-card-header">
          <SkeletonBox width={56} height={56} style={{ borderRadius: 14 }} />
          <div className="skeleton-card-text">
            <SkeletonBox width={120} height={20} style={{ marginBottom: 8 }} />
            <SkeletonBox width={160} height={14} />
          </div>
        </div>
        <div className="skeleton-benefits">
          <SkeletonBox width="100%" height={40} />
          <SkeletonBox width="100%" height={40} />
          <SkeletonBox width="100%" height={40} />
        </div>
        <SkeletonBox width="100%" height={48} style={{ borderRadius: 12, marginTop: 16 }} />
      </div>

      {/* Settings Card */}
      <div className="skeleton-card">
        <SkeletonBox width={120} height={20} style={{ marginBottom: 16 }} />
        <div className="skeleton-settings">
          <SkeletonBox width="100%" height={52} />
          <SkeletonBox width="100%" height={52} />
          <SkeletonBox width="100%" height={52} />
          <SkeletonBox width="100%" height={52} />
        </div>
      </div>

      {/* Connections Card */}
      <div className="skeleton-card">
        <SkeletonBox width={100} height={20} style={{ marginBottom: 16 }} />
        <div className="skeleton-connections">
          <SkeletonBox width="100%" height={72} />
          <SkeletonBox width="100%" height={72} />
          <SkeletonBox width="100%" height={72} />
        </div>
      </div>

      <style jsx>{`
        .profile-skeleton {
          padding: 20px 16px;
          max-width: 600px;
          margin: 0 auto;
        }

        .skeleton-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 24px;
          padding-top: 16px;
        }

        .skeleton-card {
          background: rgba(20, 20, 30, 0.7);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .skeleton-card.large {
          padding: 24px;
        }

        .skeleton-card-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .skeleton-card-text {
          flex: 1;
        }

        .skeleton-benefits {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skeleton-settings {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skeleton-connections {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
      `}</style>
    </div>
  );
}
