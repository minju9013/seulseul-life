// 서버 API 와 React Query 를 잇는 훅
// - 목록 조회는 useQuery 로 캐싱한다.
// - mutation 들은 "낙관적 업데이트"로 UI 를 즉시 반영하고, 서버 응답을 받아 다시 동기화한다.
// - 실패하면 onError 에서 직전 캐시로 롤백한다.

import { useCallback } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  listItems,
  createItem as apiCreateItem,
  updateItem as apiUpdateItem,
  deleteItem as apiDeleteItem,
  updateStock as apiUpdateStock,
} from '../api/itemsApi';

// 품목 목록 캐시를 가리키는 쿼리 키
const ITEMS_KEY = ['items'];

// 낙관적 업데이트용 임시 ID. 서버 응답을 받으면 진짜 _id 로 교체한다.
function makeTempId() {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// 서버의 status 표기('충분/부족/소진')를 클라이언트 표기('넉넉해요/부족해요/소진')로 변환.
// 클라이언트 ItemCard 가 기존 라벨을 기대하기 때문에 한 곳에서 통일.
function toClientStatus(serverStatus) {
  if (serverStatus === '충분') return '넉넉해요';
  if (serverStatus === '부족') return '부족해요';
  return '소진';
}

function clampThreshold(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 1;
  return Math.min(99, Math.max(1, Math.round(n)));
}

function normalizeItem(serverItem) {
  if (!serverItem) return null;
  const th = clampThreshold(serverItem.lowStockThreshold ?? 1);
  return {
    ...serverItem,
    lowStockThreshold: th,
    notes: serverItem.notes || '',
    status: toClientStatus(serverItem.status),
  };
}

function statusFromQuantity(quantity, lowStockThreshold = 1) {
  const q = Number(quantity) || 0;
  const t = clampThreshold(lowStockThreshold);
  if (q <= 0) return '소진';
  if (q <= t) return '부족해요';
  return '넉넉해요';
}

export default function useItems() {
  const queryClient = useQueryClient();

  // 목록 조회 (실패 시 즉시 에러를 보여주고 "다시 시도" 버튼으로 수동 재요청)
  const {
    data: items = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ITEMS_KEY,
    queryFn: async () => {
      const data = await listItems();
      return data.map(normalizeItem);
    },
    retry: false,
  });

  const refresh = useCallback(() => refetch(), [refetch]);

  // 새 품목 추가 (낙관적 업데이트)
  const addMutation = useMutation({
    mutationFn: async (payload) => {
      const th = clampThreshold(payload.lowStockThreshold ?? 1);
      const created = await apiCreateItem({
        name: payload.name,
        categoryId: payload.categoryId,
        unit: payload.unit,
        quantity: payload.quantity,
        image: payload.image,
        imagePublicId: payload.imagePublicId,
        lowStockThreshold: th,
        notes: payload.notes ? String(payload.notes).slice(0, 500) : '',
      });
      return normalizeItem(created);
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ITEMS_KEY });
      const previous = queryClient.getQueryData(ITEMS_KEY);
      const tempId = makeTempId();
      const th = clampThreshold(payload.lowStockThreshold ?? 1);
      const optimistic = {
        id: tempId,
        name: payload.name,
        categoryId: payload.categoryId,
        unit: payload.unit || '개',
        quantity: payload.quantity,
        lowStockThreshold: th,
        notes: payload.notes ? String(payload.notes).slice(0, 500) : '',
        status: statusFromQuantity(payload.quantity, th),
        image: payload.image || null,
        imagePublicId: payload.imagePublicId || null,
      };
      queryClient.setQueryData(ITEMS_KEY, (old = []) => [...old, optimistic]);
      return { previous, tempId };
    },
    onError: (_err, _payload, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(ITEMS_KEY, ctx.previous);
    },
    onSuccess: (next, _payload, ctx) => {
      queryClient.setQueryData(ITEMS_KEY, (old = []) =>
        old.map((it) => (it.id === ctx.tempId ? next : it)),
      );
    },
  });

  // 품목 정보 수정 (이름/카테고리/이미지/수량 통합)
  const editMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      const updated = await apiUpdateItem(id, payload);
      return normalizeItem(updated);
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ITEMS_KEY });
      const previous = queryClient.getQueryData(ITEMS_KEY);
      queryClient.setQueryData(ITEMS_KEY, (old = []) =>
        old.map((it) => {
          if (it.id !== id) return it;
          const th =
            payload.lowStockThreshold !== undefined
              ? clampThreshold(payload.lowStockThreshold)
              : clampThreshold(it.lowStockThreshold ?? 1);
          const nextQuantity =
            payload.quantity !== undefined ? payload.quantity : it.quantity;
          return {
            ...it,
            ...payload,
            lowStockThreshold: th,
            notes:
              payload.notes !== undefined
                ? String(payload.notes).slice(0, 500)
                : it.notes,
            status:
              payload.quantity !== undefined ||
              payload.lowStockThreshold !== undefined
                ? statusFromQuantity(nextQuantity, th)
                : it.status,
          };
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(ITEMS_KEY, ctx.previous);
    },
    onSuccess: (next, { id }) => {
      queryClient.setQueryData(ITEMS_KEY, (old = []) =>
        old.map((it) => (it.id === id ? next : it)),
      );
    },
  });

  // 수량만 변경 (스피너용 빠른 경로)
  const quantityMutation = useMutation({
    mutationFn: async ({ id, nextQuantity }) => {
      const updated = await apiUpdateStock(id, nextQuantity);
      return normalizeItem(updated);
    },
    onMutate: async ({ id, nextQuantity }) => {
      await queryClient.cancelQueries({ queryKey: ITEMS_KEY });
      const previous = queryClient.getQueryData(ITEMS_KEY);
      queryClient.setQueryData(ITEMS_KEY, (old = []) =>
        old.map((it) => {
          if (it.id !== id) return it;
          const th = clampThreshold(it.lowStockThreshold ?? 1);
          return {
            ...it,
            quantity: nextQuantity,
            status: statusFromQuantity(nextQuantity, th),
          };
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(ITEMS_KEY, ctx.previous);
    },
    onSuccess: (next, { id }) => {
      queryClient.setQueryData(ITEMS_KEY, (old = []) =>
        old.map((it) => (it.id === id ? { ...it, ...next } : it)),
      );
    },
  });

  // 품목 삭제
  const removeMutation = useMutation({
    mutationFn: (id) => apiDeleteItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ITEMS_KEY });
      const previous = queryClient.getQueryData(ITEMS_KEY);
      queryClient.setQueryData(ITEMS_KEY, (old = []) =>
        old.filter((it) => it.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(ITEMS_KEY, ctx.previous);
    },
  });

  const addItem = useCallback(
    (payload) => addMutation.mutateAsync(payload),
    [addMutation],
  );

  const editItem = useCallback(
    (id, payload) => editMutation.mutateAsync({ id, payload }),
    [editMutation],
  );

  const changeQuantity = useCallback(
    (id, nextQuantity) => quantityMutation.mutateAsync({ id, nextQuantity }),
    [quantityMutation],
  );

  const removeItem = useCallback(
    (id) => removeMutation.mutateAsync(id),
    [removeMutation],
  );

  return {
    items,
    isLoading,
    error,
    refresh,
    addItem,
    editItem,
    changeQuantity,
    removeItem,
  };
}
