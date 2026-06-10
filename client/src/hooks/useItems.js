// 서버 API 와 React Query 를 잇는 훅
// - 목록 조회는 useQuery 로 캐싱한다.
// - 추가/수정/삭제 mutation 은 "낙관적 업데이트"로 UI 를 즉시 반영하고, 실패 시 롤백한다.
// - 수량 +/- 는 캐시를 즉시 갱신하고(델타 누적), 서버 커밋은 디바운스해 한 번만 보낸다.

import { useCallback, useEffect, useRef } from 'react';
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

// 연타가 끝났다고 판단하기까지 기다리는 시간(ms). 이 시간 동안의 +/- 는 한 번에 커밋된다.
const QUANTITY_COMMIT_DELAY = 400;

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

function clampQuantity(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.min(99, Math.max(0, Math.round(n)));
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

export default function useItems(options = {}) {
  const queryClient = useQueryClient();

  // 수량 커밋 결과를 알리는 콜백(토스트 표시용). 최신 값을 ref 로 들고 있는다.
  const onQuantityCommittedRef = useRef(options.onQuantityCommitted);
  onQuantityCommittedRef.current = options.onQuantityCommitted;

  // 아이템별 디바운스 타이머와, 연타 시작 직전 수량(되돌리기 기준값)
  const commitTimersRef = useRef(new Map());
  const baselinesRef = useRef(new Map());

  // 언마운트 시 남은 타이머 정리
  useEffect(() => {
    const timers = commitTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

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

  // 현재 캐시에서 특정 아이템을 읽는다.
  const readItem = useCallback(
    (id) => {
      const list = queryClient.getQueryData(ITEMS_KEY) || [];
      return list.find((it) => it.id === id) || null;
    },
    [queryClient],
  );

  // 캐시의 수량을 즉시 갱신한다. compute(현재수량) → 다음수량.
  const writeQuantity = useCallback(
    (id, compute) => {
      queryClient.setQueryData(ITEMS_KEY, (old = []) =>
        old.map((it) => {
          if (it.id !== id) return it;
          const th = clampThreshold(it.lowStockThreshold ?? 1);
          const next = clampQuantity(compute(it.quantity ?? 0));
          return { ...it, quantity: next, status: statusFromQuantity(next, th) };
        }),
      );
    },
    [queryClient],
  );

  // 디바운스가 끝나면 캐시의 최종 수량을 서버에 한 번만 커밋한다.
  const scheduleCommit = useCallback(
    (id) => {
      const timers = commitTimersRef.current;
      if (timers.has(id)) clearTimeout(timers.get(id));

      const timer = setTimeout(async () => {
        timers.delete(id);
        const baseline = baselinesRef.current.get(id) ?? 0;
        baselinesRef.current.delete(id);

        const row = readItem(id);
        const target = row?.quantity ?? 0;
        const name = row?.name;

        // 연타 결과가 결국 제자리면 서버 호출/토스트 생략
        if (target === baseline) return;

        try {
          const updated = normalizeItem(await apiUpdateStock(id, target));
          queryClient.setQueryData(ITEMS_KEY, (old = []) =>
            old.map((it) => (it.id === id ? { ...it, ...updated } : it)),
          );
          onQuantityCommittedRef.current?.({
            id,
            name,
            quantity: target,
            baselineQuantity: baseline,
            // 되돌리기: 연타 시작 전 값으로 다시 설정
            // eslint-disable-next-line no-use-before-define
            revert: () => setQuantity(id, baseline),
          });
        } catch (err) {
          // 실패 시 연타 시작 전 값으로 롤백
          writeQuantity(id, () => baseline);
          onQuantityCommittedRef.current?.({ id, name, error: err });
        }
      }, QUANTITY_COMMIT_DELAY);

      timers.set(id, timer);
    },
    [queryClient, readItem, writeQuantity],
  );

  // 수량 변경의 공통 진입점: 연타 시작 시 baseline 을 캡처하고, 즉시 반영 후 커밋 예약
  const mutateQuantity = useCallback(
    (id, compute) => {
      if (!baselinesRef.current.has(id)) {
        const row = readItem(id);
        baselinesRef.current.set(id, row?.quantity ?? 0);
      }
      writeQuantity(id, compute);
      scheduleCommit(id);
    },
    [readItem, writeQuantity, scheduleCommit],
  );

  // +/- 스텝 (델타 누적). 캐시의 현재 값을 기준으로 계산하므로 연타해도 누락되지 않는다.
  const stepQuantity = useCallback(
    (id, delta) => mutateQuantity(id, (q) => q + delta),
    [mutateQuantity],
  );

  // 절대값 지정 (숫자 입력칸용)
  const setQuantity = useCallback(
    (id, nextQuantity) => mutateQuantity(id, () => nextQuantity),
    [mutateQuantity],
  );

  const addItem = useCallback(
    (payload) => addMutation.mutateAsync(payload),
    [addMutation],
  );

  const editItem = useCallback(
    (id, payload) => editMutation.mutateAsync({ id, payload }),
    [editMutation],
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
    stepQuantity,
    setQuantity,
    removeItem,
  };
}
