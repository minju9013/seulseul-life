import React from 'react';
import ItemCard from './ItemCard';
import { ALL_CATEGORY_ID } from '../data/categories';
import './ItemCardList.css';

function ItemCardList({
  items,
  activeCategory,
  getCategoryById,
  isFiltering = false,
  isLoading = false,
  onClearFilters,
  onStepQuantity,
  onSetQuantity,
  onEdit,
}) {
  if (isLoading && (!items || items.length === 0)) {
    return (
      <main className="item-list-wrap is-loading" aria-busy="true">
        <div className="item-grid">
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <div key={key} className="item-card-skeleton" />
          ))}
        </div>
      </main>
    );
  }

  const isEmpty = !items || items.length === 0;
  const isAllCategory = activeCategory?.id === ALL_CATEGORY_ID;

  if (isEmpty) {
    return (
      <main className="item-list-wrap is-empty">
        <div className="empty-state">
          <div className="empty-illustration" aria-hidden="true">
            <svg
              className="empty-box"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <ellipse cx="60" cy="100" rx="38" ry="6" fill="#eef2f7" />
              <path
                d="M20 46 L60 28 L100 46 L100 82 L60 100 L20 82 Z"
                fill="#f8fafc"
                stroke="#cbd5e1"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M20 46 L60 64 L100 46"
                stroke="#cbd5e1"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d="M60 64 L60 100"
                stroke="#cbd5e1"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M40 38 L60 48 L80 38"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="3 4"
              />
            </svg>
            {!isFiltering && activeCategory?.emoji && !isAllCategory && (
              <span className="empty-emoji-badge" role="img" aria-label={activeCategory?.label}>
                {activeCategory.emoji}
              </span>
            )}
          </div>
          {isFiltering ? (
            <>
              <p className="empty-title">조건에 맞는 품목이 없어요</p>
              <p className="empty-subtitle">검색어나 상태 필터를 조정해보세요</p>
              {onClearFilters && (
                <button
                  type="button"
                  className="empty-clear-filters"
                  onClick={onClearFilters}
                >
                  필터 초기화
                </button>
              )}
            </>
          ) : (
            <>
              <p className="empty-title">
                {isAllCategory || !activeCategory?.label
                  ? '아직 품목이 없어요'
                  : `${activeCategory.label}에 아직 품목이 없어요`}
              </p>
              <p className="empty-subtitle">
                오른쪽 아래 <span className="empty-plus">+</span> 버튼으로 새 품목을 추가해보세요
              </p>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="item-list-wrap">
      <div className="item-grid">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            categoryEmoji={getCategoryById?.(item.categoryId)?.emoji}
            onStepQuantity={onStepQuantity}
            onSetQuantity={onSetQuantity}
            onEdit={onEdit}
          />
        ))}
      </div>
    </main>
  );
}

export default ItemCardList;
