"use client";
import { Lock, Shuffle, Crown } from '@phosphor-icons/react';
import AlibiBottomSheet from './AlibiBottomSheet';
import { ALIBI_EMOJIS } from '@/lib/config/alibi-emojis';
import { PRO_CONTENT } from '@/lib/subscription';

export default function PartyAlibiPreviewModal({
  isOpen,
  onClose,
  alibiOptions,
  userIsPro,
  onUpgrade,
}) {
  const freeCount = PRO_CONTENT.alibi.free;
  const totalCount = alibiOptions.length;

  const headerExtra = (
    <div className="party-preview-desc">
      <Shuffle size={16} weight="bold" className="party-preview-desc-icon" />
      <span>
        {userIsPro
          ? <>Chaque équipe recevra un alibi aléatoire parmi <strong>tous les {totalCount} alibis</strong> 🎉</>
          : <>Chaque équipe recevra un alibi aléatoire parmi les <strong>{freeCount} alibis gratuits</strong></>
        }
      </span>
    </div>
  );

  return (
    <AlibiBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Alibis Party Mode"
      sheetClassName="party-preview-modal"
      headerExtra={headerExtra}
    >
      <div className="alibi-modal-list">
        {alibiOptions.map((alibi, index) => {
          const isLocked = !userIsPro && index >= freeCount;
          const isLastFree = !userIsPro && index === freeCount - 1;
          const emoji = ALIBI_EMOJIS[alibi.id] || '🎭';

          return (
            <div key={alibi.id}>
              <div
                className={`alibi-item party-preview-item ${isLocked ? 'locked' : ''}`}
                style={isLastFree ? { borderRadius: '10px 10px 0 0', marginBottom: 0 } : undefined}
              >
                <span className="alibi-item-emoji">{emoji}</span>
                <div className="alibi-item-info">
                  <span className="alibi-item-title">{alibi.title}</span>
                </div>
                <div className="alibi-item-status">
                  {isLocked ? (
                    <span className="alibi-item-lock">
                      <Lock size={14} />
                      PRO
                    </span>
                  ) : (
                    <span className="party-preview-check">✓</span>
                  )}
                </div>
              </div>

              {/* Stacked upgrade tag — tucked behind last free alibi */}
              {isLastFree && (
                <div
                  className="party-preview-upgrade-tag"
                  onClick={() => { onClose(); onUpgrade?.(); }}
                >
                  <div className="party-preview-upgrade-left">
                    <Crown size={16} weight="fill" />
                    <span>Débloquer les {totalCount} alibis</span>
                  </div>
                  <span className="party-preview-upgrade-badge">PRO</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AlibiBottomSheet>
  );
}
