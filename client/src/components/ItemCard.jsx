import React from 'react';
import './ItemCard.css';

const STATUS_STYLES = {
  넉넉해요: 'is-enough',
  부족해요: 'is-low',
  소진: 'is-empty',
};

function clampQuantity(value) {
  const n = Number.isNaN(Number(value)) ? 0 : Number(value);
  if (n < 0) return 0;
  if (n > 99) return 99;
  return n;
}

function ItemCard({ item, categoryEmoji, onStepQuantity, onSetQuantity, onEdit }) {
  const statusClass = STATUS_STYLES[item.status] || 'is-empty';
  const displayQuantity = typeof item.quantity === 'number' ? item.quantity : 0;
  const hasNotes = Boolean((item.notes || '').trim());

  // 연타 시 누락을 막기 위해 절대값이 아니라 증감량(delta)을 넘긴다.
  // 실제 다음 수량 계산/클램프는 캐시 기준으로 useItems 가 처리한다.
  const handleStep = (delta) => {
    onStepQuantity?.(item.id, delta);
  };

  const handleInputChange = (e) => {
    const next = clampQuantity(e.target.value);
    onSetQuantity?.(item.id, next);
  };

  // 카테고리에서 이모지를 받아오고, 못 찾으면 기본 박스 이모지로 fallback.
  const placeholderEmoji = categoryEmoji || '📦';

  return (
    <div className="item-card">
      <div className="item-image-wrap">
        {item.image ? (
          <img src={item.image} alt={item.name} className="item-image" />
        ) : (
          <span className="item-emoji">{placeholderEmoji}</span>
        )}
        <button
          type="button"
          aria-label="편집"
          className="item-edit-button"
          onClick={() => onEdit?.(item)}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="item-edit-icon-svg"
          >
            <path
              d="M14.06 4.94a2.12 2.12 0 0 1 3 0l2 2a2.12 2.12 0 0 1 0 3L9.2 19.8 4 21l1.2-5.2 8.86-10.86Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="m12.5 6.5 5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="item-body">
        <div className="item-title-row">
          <div className="item-title-wrap">
            <div className="item-title-line">
              <p className="item-title">{item.name}</p>
              {hasNotes && <span className="item-note-dot" aria-hidden="true" />}
            </div>
            <span className={`item-status ${statusClass}`}>{item.status}</span>
          </div>
        </div>

        <div className="item-meta-row">
          <div className="spinner">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              className="spinner-button"
            >
              -
            </button>
            <input
              type="number"
              min="0"
              max="99"
              value={displayQuantity}
              onChange={handleInputChange}
              className="spinner-input"
            />
            <button
              type="button"
              onClick={() => handleStep(1)}
              className="spinner-button is-plus"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ItemCard;

