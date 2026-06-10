// 품목 목록의 카테고리/검색/상태필터/정렬을 한 곳에서 관리하는 훅
// - activeCategoryId 는 카테고리 탭이 소유하므로 인자로 받는다.
// - 파생 목록(itemsInCategory → filteredItems → sortedDisplayItems)을 단계적으로 계산한다.

import { useCallback, useMemo, useState } from 'react';
import { ALL_CATEGORY_ID } from '../data/categories';

export default function useItemFilters(items, activeCategoryId) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('recent');

  const itemsInCategory = useMemo(
    () =>
      activeCategoryId === ALL_CATEGORY_ID
        ? items
        : items.filter((item) => item.categoryId === activeCategoryId),
    [items, activeCategoryId],
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return itemsInCategory.filter((item) => {
      if (query && !(item.name || '').toLowerCase().includes(query)) {
        return false;
      }
      if (statusFilter === 'shopping') {
        if (item.status !== '부족해요' && item.status !== '소진') return false;
      } else if (statusFilter === 'empty') {
        if (item.status !== '소진') return false;
      }
      return true;
    });
  }, [itemsInCategory, searchQuery, statusFilter]);

  const sortedDisplayItems = useMemo(() => {
    const arr = [...filteredItems];
    switch (sortKey) {
      case 'name':
        arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
        break;
      case 'qtyAsc':
        arr.sort((a, b) => (a.quantity ?? 0) - (b.quantity ?? 0));
        break;
      case 'qtyDesc':
        arr.sort((a, b) => (b.quantity ?? 0) - (a.quantity ?? 0));
        break;
      case 'recent':
      default:
        arr.sort((a, b) => {
          const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
          const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
          return tb - ta;
        });
    }
    return arr;
  }, [filteredItems, sortKey]);

  const isFiltering =
    Boolean(searchQuery.trim()) || (statusFilter && statusFilter !== 'all');

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
  }, []);

  return {
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
  };
}
