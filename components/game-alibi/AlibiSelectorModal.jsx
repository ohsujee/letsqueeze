"use client";
import { Check, Lock } from '@phosphor-icons/react';
import AlibiBottomSheet from './AlibiBottomSheet';
import { ALIBI_EMOJIS } from '@/lib/config/alibi-emojis';
import { PRO_CONTENT } from '@/lib/subscription';

export default function AlibiSelectorModal({
  isOpen,
  onClose,
  alibiOptions,
  selectedAlibiId,
  onSelectAlibi,
  userIsPro
}) {
  const handleSelect = (alibiId, isLocked) => {
    if (isLocked) return;
    onSelectAlibi(alibiId);
    onClose();
  };

  return (
    <AlibiBottomSheet isOpen={isOpen} onClose={onClose} title="Choisis un Alibi">
      <div className="alibi-modal-list">
        {alibiOptions.map((alibi, index) => {
          const isSelected = selectedAlibiId === alibi.id;
          const isLocked = !userIsPro && index >= PRO_CONTENT.alibi.free;
          const emoji = ALIBI_EMOJIS[alibi.id] || '🎭';

          return (
            <button
              key={alibi.id}
              className={`alibi-item ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
              onClick={() => handleSelect(alibi.id, isLocked)}
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
                ) : isSelected ? (
                  <span className="alibi-item-check">
                    <Check size={18} />
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </AlibiBottomSheet>
  );
}
