import React, { useCallback, useMemo, useRef, useState } from 'react';
import AppBar from './components/AppBar';
import CategoryTabs from './components/CategoryTabs';
import ItemCardList from './components/ItemCardList';
import AddItemModal from './components/AddItemModal';
import AddCategoryModal from './components/AddCategoryModal';
import ConfirmDialog from './components/ConfirmDialog';
import ItemFilters from './components/ItemFilters';
import SearchBar from './components/SearchBar';
import Toast from './components/Toast';
import CategorySortSheet from './components/CategorySortSheet';
import useItems from './hooks/useItems';
import useCategories from './hooks/useCategories';
import useItemFilters from './hooks/useItemFilters';
import useToast from './hooks/useToast';
import { useAuth } from './auth/AuthProvider';
import { ALL_CATEGORY_ID } from './data/categories';
import './App.css';

function App() {
  const [activeCategoryId, setActiveCategoryId] = useState(ALL_CATEGORY_ID);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isAddCategoryOpen, setAddCategoryOpen] = useState(false);
  const [isEditingCategories, setEditingCategories] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState(null);
  const [isCategorySortOpen, setCategorySortOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);

  const searchInputRef = useRef(null);

  const { signOut } = useAuth();

  const { toast, showToast, dismissToast } = useToast();

  // 수량 커밋(디바운스 후 서버 반영)이 끝나면 한 번만 토스트로 알린다.
  const handleQuantityCommitted = useCallback(
    (info) => {
      if (info.error) {
        showToast(info.error.message || '수량 변경에 실패했어요');
        return;
      }
      showToast({
        message: `${info.name || '품목'} 수량을 ${info.quantity}개로 바꿨어요`,
        actionLabel: '되돌리기',
        onAction: info.revert,
      });
    },
    [showToast],
  );

  const {
    items,
    isLoading,
    error,
    refresh,
    addItem,
    editItem,
    stepQuantity,
    setQuantity,
    removeItem,
  } = useItems({ onQuantityCommitted: handleQuantityCommitted });

  const {
    categories,
    getCategoryById,
    isLabelDuplicate,
    addCategory,
    editCategory,
    removeCategory,
    resetCategory,
    reorderCategory,
    MAX_LABEL_LENGTH,
  } = useCategories();

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortKey,
    setSortKey,
    itemsInCategory,
    filteredItems,
    sortedDisplayItems,
    isFiltering,
    clearAllFilters,
  } = useItemFilters(items, activeCategoryId);

  const handleAddItem = async (payload) => {
    await addItem(payload);
    if (activeCategoryId !== ALL_CATEGORY_ID) {
      setActiveCategoryId(payload.categoryId);
    }
    showToast(`${payload.name}이(가) 추가되었어요`);
  };

  const handleUpdateItem = async ({ id, ...payload }) => {
    await editItem(id, payload);
    if (activeCategoryId !== ALL_CATEGORY_ID) {
      setActiveCategoryId(payload.categoryId);
    }
    showToast(`${payload.name}이(가) 수정되었어요`);
  };

  const handleDeleteItem = async ({ id, name }) => {
    const snapshot = items.find((it) => it.id === id);
    if (!snapshot) return;

    await removeItem(id);

    showToast({
      message: `${name}이(가) 삭제되었어요`,
      actionLabel: '되돌리기',
      onAction: async () => {
        try {
          await addItem({
            name: snapshot.name,
            categoryId: snapshot.categoryId,
            unit: snapshot.unit || '개',
            quantity: snapshot.quantity ?? 0,
            image: snapshot.image,
            imagePublicId: snapshot.imagePublicId,
            lowStockThreshold: snapshot.lowStockThreshold ?? 1,
            notes: snapshot.notes || '',
          });
          showToast(`${snapshot.name}을(를) 다시 추가했어요`);
        } catch (e) {
          showToast(e?.message || '되돌리기에 실패했어요');
        }
      },
    });
  };

  const handleSearchToggle = () => {
    setSearchExpanded((prev) => {
      const next = !prev;
      if (next) {
        queueMicrotask(() => searchInputRef.current?.focus());
      }
      return next;
    });
  };

  const showSearchBar =
    searchExpanded || Boolean(searchQuery.trim());

  const handleAddCategory = async ({ label, emoji }) => {
    const next = addCategory({ label, emoji });
    setActiveCategoryId(next.id);
    showToast(`${next.label} 카테고리가 추가되었어요`);
  };

  const handleRequestEditCategory = (category) => {
    if (!category) return;
    setEditingCategory(category);
  };

  const handleEditCategory = async ({ id, label, emoji }) => {
    editCategory(id, { label, emoji });
    showToast(`${label} 카테고리가 수정되었어요`);
  };

  const handleResetCategory = async (id) => {
    const target = getCategoryById(id);
    resetCategory(id);
    showToast(`${target?.label || '카테고리'} 가 기본값으로 되돌아갔어요`);
  };

  const handleRequestDeleteCategory = (category) => {
    if (!category) return;
    const usedCount = items.filter((it) => it.categoryId === category.id).length;
    if (usedCount > 0) {
      showToast(
        `이 카테고리에 품목이 ${usedCount}개 있어 삭제할 수 없어요. 먼저 품목을 옮기거나 삭제해주세요.`,
      );
      return;
    }
    setPendingDeleteCategory(category);
  };

  const handleConfirmDeleteCategory = () => {
    if (!pendingDeleteCategory) return;
    const target = pendingDeleteCategory;
    removeCategory(target.id);
    if (activeCategoryId === target.id) {
      setActiveCategoryId(ALL_CATEGORY_ID);
    }
    setPendingDeleteCategory(null);
    showToast(`${target.label} 카테고리가 삭제되었어요`);
  };

  const handleToggleEditCategories = () => {
    setEditingCategories((prev) => !prev);
  };

  const editingItem = useMemo(
    () => items.find((it) => it.id === editingItemId) || null,
    [items, editingItemId],
  );

  const activeCategory = getCategoryById(activeCategoryId);

  const defaultCategoryForModal =
    activeCategoryId === ALL_CATEGORY_ID
      ? categories[0]?.id
      : activeCategoryId;

  return (
    <div className="page">
      <div className="mobile-frame">
        <AppBar
          onSearchClick={handleSearchToggle}
          searchHighlighted={showSearchBar}
          onSignOut={signOut}
        />
        {showSearchBar && (
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            inputRef={searchInputRef}
          />
        )}
        <CategoryTabs
          categories={categories}
          activeCategoryId={activeCategoryId}
          isEditing={isEditingCategories}
          onChange={setActiveCategoryId}
          onAddCategory={() => setAddCategoryOpen(true)}
          onToggleEdit={handleToggleEditCategories}
          onRequestEdit={handleRequestEditCategory}
          onRequestDelete={handleRequestDeleteCategory}
          onOpenSortSheet={() => setCategorySortOpen(true)}
        />
        <ItemFilters
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          sortKey={sortKey}
          totalCount={itemsInCategory.length}
          filteredCount={filteredItems.length}
          onStatusFilterChange={setStatusFilter}
          onSortChange={setSortKey}
        />
        {error && (
          <div className="page-error" role="alert">
            <div className="page-error-row">
              <span>데이터를 불러오지 못했어요. {error.message}</span>
              <button
                type="button"
                className="page-error-retry"
                onClick={() => refresh()}
              >
                다시 시도
              </button>
            </div>
          </div>
        )}
        <ItemCardList
          items={sortedDisplayItems}
          activeCategory={activeCategory}
          getCategoryById={getCategoryById}
          isFiltering={isFiltering}
          onClearFilters={clearAllFilters}
          onStepQuantity={stepQuantity}
          onSetQuantity={setQuantity}
          onEdit={(item) => setEditingItemId(item.id)}
          isLoading={isLoading}
        />
        <button
          type="button"
          className="floating-add-button"
          aria-label="새 품목 추가"
          onClick={() => setAddOpen(true)}
        >
          <svg
            className="floating-add-icon"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            aria-hidden="true"
          >
            <path
              d="M12 5v14M5 12h14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <AddItemModal
          isOpen={isAddOpen || Boolean(editingItem)}
          categories={categories}
          defaultCategoryId={defaultCategoryForModal}
          items={items}
          editingItem={editingItem}
          onClose={() => {
            setAddOpen(false);
            setEditingItemId(null);
          }}
          onAdd={handleAddItem}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
        />
        <AddCategoryModal
          isOpen={isAddCategoryOpen || Boolean(editingCategory)}
          editingCategory={editingCategory}
          isLabelDuplicate={isLabelDuplicate}
          maxLength={MAX_LABEL_LENGTH}
          onClose={() => {
            setAddCategoryOpen(false);
            setEditingCategory(null);
          }}
          onAdd={handleAddCategory}
          onUpdate={handleEditCategory}
          onReset={handleResetCategory}
        />
        <CategorySortSheet
          isOpen={isCategorySortOpen}
          categories={categories}
          onClose={() => setCategorySortOpen(false)}
          onReorderCategory={reorderCategory}
        />
        <ConfirmDialog
          isOpen={Boolean(pendingDeleteCategory)}
          title="이 카테고리를 삭제할까요?"
          description={
            pendingDeleteCategory
              ? `${pendingDeleteCategory.emoji} ${pendingDeleteCategory.label} 카테고리를 삭제합니다.\n이 작업은 되돌릴 수 없어요.`
              : ''
          }
          confirmText="삭제"
          danger
          onCancel={() => setPendingDeleteCategory(null)}
          onConfirm={handleConfirmDeleteCategory}
        />
        <Toast
          key={toast?.id}
          message={toast?.message}
          actionLabel={toast?.actionLabel}
          onAction={toast?.onAction}
          onDismiss={dismissToast}
        />
      </div>
    </div>
  );
}

export default App;
