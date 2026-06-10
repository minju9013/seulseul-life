// 내장 카테고리(CATEGORIES) + 사용자 커스텀 카테고리를 합쳐서 관리한다.
// - 내장 카테고리는 ID 가 고정되어 있고, 사용자의 라벨/이모지 수정은 "override" 로 따로 저장한다.
// - 내장 카테고리를 "삭제"하면 실제 항목은 보존되고 화면에서 "숨김(hidden)" 처리된다.
// - localStorage 에 영속화되며, 서버 GET/PUT /api/preferences 로 동기화한다.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ALL_CATEGORY,
  ALL_CATEGORY_ID,
  CATEGORIES,
  DEFAULT_HIDDEN_BUILTIN_IDS,
} from '../data/categories';
import { getPreferences, putPreferences } from '../api/preferencesApi';
import usePersistentState from './usePersistentState';

const CUSTOM_KEY = 'joo-seul-seul.customCategories.v1';
const OVERRIDES_KEY = 'joo-seul-seul.categoryOverrides.v1';
const CATEGORY_ORDER_KEY = 'joo-seul-seul.categoryOrder.v1';
const MAX_LABEL_LENGTH = 12;
const MAX_CUSTOM_CATEGORIES = 12;

function makeCustomCategoryId() {
  return `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function isBuiltInId(id) {
  return CATEGORIES.some((c) => c.id === id);
}

function isBuiltInVisible(cat, overrides) {
  if (overrides[cat.id] === null) return false;
  if (
    DEFAULT_HIDDEN_BUILTIN_IDS.includes(cat.id) &&
    !(cat.id in overrides)
  ) {
    return false;
  }
  return true;
}

export default function useCategories() {
  const [customCategories, setCustomCategories] = usePersistentState(
    CUSTOM_KEY,
    [],
  );
  const [overrides, setOverrides] = usePersistentState(OVERRIDES_KEY, {});
  const [categoryOrder, setCategoryOrder] = usePersistentState(
    CATEGORY_ORDER_KEY,
    [],
  );

  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getPreferences()
      .then((data) => {
        if (cancelled || !data) return;
        const overridesKeys =
          data.overrides && typeof data.overrides === 'object'
            ? Object.keys(data.overrides)
            : [];
        const serverEmpty =
          (!Array.isArray(data.customCategories) || data.customCategories.length === 0) &&
          overridesKeys.length === 0 &&
          (!Array.isArray(data.categoryOrder) || data.categoryOrder.length === 0);
        if (serverEmpty) return;

        if (Array.isArray(data.customCategories)) {
          setCustomCategories(data.customCategories);
        }
        if (data.overrides && typeof data.overrides === 'object') {
          setOverrides(data.overrides);
        }
        if (Array.isArray(data.categoryOrder)) {
          setCategoryOrder(data.categoryOrder);
        }
      })
      .catch(() => {})
      .finally(() => {
        hydratedRef.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [setCustomCategories, setOverrides, setCategoryOrder]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => {
      putPreferences({
        customCategories,
        overrides,
        categoryOrder,
      }).catch(() => {});
    }, 700);
    return () => clearTimeout(t);
  }, [customCategories, overrides, categoryOrder]);

  const visibleBuiltIns = useMemo(
    () =>
      CATEGORIES.filter((c) => isBuiltInVisible(c, overrides)).map((c) => {
        const ov = overrides[c.id];
        return {
          ...c,
          ...(ov && typeof ov === 'object' ? ov : {}),
          isCustom: false,
          hasOverride: Boolean(ov && typeof ov === 'object'),
        };
      }),
    [overrides],
  );

  const categoriesMerged = useMemo(
    () => [...visibleBuiltIns, ...customCategories],
    [visibleBuiltIns, customCategories],
  );

  const categories = useMemo(() => {
    const merged = categoriesMerged;
    const idSet = new Set(merged.map((c) => c.id));
    let order = categoryOrder.filter((id) => idSet.has(id));
    for (const c of merged) {
      if (!order.includes(c.id)) order.push(c.id);
    }
    return order.map((id) => merged.find((c) => c.id === id)).filter(Boolean);
  }, [categoriesMerged, categoryOrder]);

  const categoryPersistence = useMemo(
    () => ({
      customCategories,
      overrides,
      categoryOrder,
    }),
    [customCategories, overrides, categoryOrder],
  );

  const applyCategoryImport = useCallback(
    (payload) => {
      if (!payload || typeof payload !== 'object') return;
      if (Array.isArray(payload.customCategories)) {
        setCustomCategories(payload.customCategories);
      }
      if (payload.overrides && typeof payload.overrides === 'object') {
        setOverrides(payload.overrides);
      }
      if (Array.isArray(payload.categoryOrder)) {
        setCategoryOrder(payload.categoryOrder);
      }
    },
    [setCustomCategories, setOverrides, setCategoryOrder],
  );

  const moveCategory = useCallback(
    (id, delta) => {
      setCategoryOrder((prevOrder) => {
        const merged = categoriesMerged;
        const idSet = new Set(merged.map((c) => c.id));
        let order = prevOrder.filter((cid) => idSet.has(cid));
        for (const c of merged) {
          if (!order.includes(c.id)) order.push(c.id);
        }
        const i = order.indexOf(id);
        if (i < 0) return prevOrder;
        const j = i + delta;
        if (j < 0 || j >= order.length) return prevOrder;
        const next = [...order];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      });
    },
    [categoriesMerged, setCategoryOrder],
  );

  const reorderCategory = useCallback(
    (fromId, toId) => {
      setCategoryOrder((prevOrder) => {
        const merged = categoriesMerged;
        const idSet = new Set(merged.map((c) => c.id));
        let order = prevOrder.filter((cid) => idSet.has(cid));
        for (const c of merged) {
          if (!order.includes(c.id)) order.push(c.id);
        }
        const fromIdx = order.indexOf(fromId);
        const toIdx = order.indexOf(toId);
        if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return prevOrder;
        const next = [...order];
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, fromId);
        return next;
      });
    },
    [categoriesMerged, setCategoryOrder],
  );

  const isLabelDuplicate = useCallback(
    (label, excludeId) => {
      const trimmed = (label || '').trim();
      if (!trimmed) return false;
      return categories.some(
        (c) => c.id !== excludeId && c.label.trim() === trimmed,
      );
    },
    [categories],
  );

  const getCategoryById = useCallback(
    (catId) => {
      if (catId === ALL_CATEGORY_ID) return ALL_CATEGORY;
      const found = categories.find((c) => c.id === catId);
      if (found) return found;
      return CATEGORIES.find((c) => c.id === catId);
    },
    [categories],
  );

  const validateLabel = useCallback(
    (label, excludeId) => {
      const trimmed = (label || '').trim();
      if (!trimmed) {
        throw new Error('카테고리 이름을 입력해주세요.');
      }
      if (trimmed.length > MAX_LABEL_LENGTH) {
        throw new Error(`카테고리 이름은 최대 ${MAX_LABEL_LENGTH}자까지 가능해요.`);
      }
      if (isLabelDuplicate(trimmed, excludeId)) {
        throw new Error('같은 이름의 카테고리가 이미 있어요.');
      }
      return trimmed;
    },
    [isLabelDuplicate],
  );

  const addCategory = useCallback(
    ({ label, emoji }) => {
      const trimmed = validateLabel(label);
      if (customCategories.length >= MAX_CUSTOM_CATEGORIES) {
        throw new Error(
          `커스텀 카테고리는 최대 ${MAX_CUSTOM_CATEGORIES}개까지 만들 수 있어요.`,
        );
      }

      const next = {
        id: makeCustomCategoryId(),
        label: trimmed,
        emoji: emoji || '📦',
        isCustom: true,
      };
      setCustomCategories((prev) => [...prev, next]);
      setCategoryOrder((prev) => (prev.includes(next.id) ? prev : [...prev, next.id]));
      return next;
    },
    [
      validateLabel,
      customCategories.length,
      setCustomCategories,
      setCategoryOrder,
    ],
  );

  const editCategory = useCallback(
    (catId, { label, emoji }) => {
      const trimmed = validateLabel(label, catId);
      if (isBuiltInId(catId)) {
        setOverrides((prev) => ({
          ...prev,
          [catId]: { label: trimmed, emoji: emoji || '📦' },
        }));
      } else {
        setCustomCategories((prev) =>
          prev.map((c) =>
            c.id === catId ? { ...c, label: trimmed, emoji: emoji || '📦' } : c,
          ),
        );
      }
    },
    [validateLabel, setOverrides, setCustomCategories],
  );

  const removeCategory = useCallback(
    (catId) => {
      setCategoryOrder((prev) => prev.filter((cid) => cid !== catId));
      if (isBuiltInId(catId)) {
        setOverrides((prev) => ({ ...prev, [catId]: null }));
      } else {
        setCustomCategories((prev) => prev.filter((c) => c.id !== catId));
      }
    },
    [setOverrides, setCustomCategories, setCategoryOrder],
  );

  const resetCategory = useCallback(
    (catId) => {
      if (!isBuiltInId(catId)) return;
      setOverrides((prev) => {
        if (!(catId in prev)) return prev;
        const next = { ...prev };
        delete next[catId];
        return next;
      });
    },
    [setOverrides],
  );

  return {
    categories,
    customCategories,
    getCategoryById,
    isLabelDuplicate,
    addCategory,
    editCategory,
    removeCategory,
    resetCategory,
    moveCategory,
    reorderCategory,
    applyCategoryImport,
    categoryPersistence,
    isBuiltInId,
    MAX_LABEL_LENGTH,
    MAX_CUSTOM_CATEGORIES,
  };
}
