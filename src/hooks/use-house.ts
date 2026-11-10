"use client";

// Центральный хук данных хозяйства: загрузка bootstrap + инвентаря, мутации с обновлением.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  Bootstrap,
  ExpenseCategory,
  InventoryItemDTO,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as { error: unknown }).error)
        : "Что-то пошло не так";
    throw new Error(message);
  }
  return payload as T;
}

export interface NewTaskInput {
  title: string;
  roomId: string | null;
  priority: TaskPriority;
  dueDate: string | null; // ISO
  repeatDays?: number | null; // каждый N дней — регулярное дело, null/undefined — разовое
}

export interface NewExpenseInput {
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string | null; // ISO
}

export interface NewInventoryItemInput {
  name: string;
  category: string | null;
  quantity: number;
  unit: string; // «шт», «кг», «л», «уп»…
  minQuantity: number | null; // порог «докупить», null — не следим
  location: string | null; // место хранения
  price: number | null;
  purchaseDate: string | null; // ISO
  receiptImage: string | null; // фото чека, data URL или null
}

export function useHouse() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [inventory, setInventory] = useState<InventoryItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const fresh = await request<Bootstrap>("/api/bootstrap", { cache: "no-store" });
      setData(fresh);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  // Инвентарь живёт отдельной выборкой: фото чеков тяжёлые, не тащим их в bootstrap.
  const refreshInventory = useCallback(async () => {
    try {
      const fresh = await request<{ items: InventoryItemDTO[] }>("/api/inventory", {
        cache: "no-store",
      });
      setInventory(fresh.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки инвентаря");
    }
  }, []);

  useEffect(() => {
    // Первичная загрузка дома: bootstrap + инвентарь. Зовём из колбэка
    // микрозадачи, а не синхронно из тела эффекта (react-hooks/set-state-in-effect).
    queueMicrotask(() => void Promise.all([refresh(), refreshInventory()]));
  }, [refresh, refreshInventory]);

  const wrap = useCallback(
    async (
      fn: () => Promise<unknown>,
      successMessage?: string,
      refresher: () => Promise<void> = refresh,
    ) => {
      try {
        await fn();
        await refresher();
        if (successMessage) toast.success(successMessage);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Ошибка операции");
      }
    },
    [refresh],
  );

  const addTask = useCallback(
    (input: NewTaskInput) =>
      wrap(
        () =>
          request("/api/tasks", {
            method: "POST",
            body: JSON.stringify(input),
          }),
        "Задача добавлена",
      ),
    [wrap],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<NewTaskInput> & { status?: TaskStatus }) =>
      wrap(() =>
        request(`/api/tasks/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        }),
      ),
    [wrap],
  );

  const deleteTask = useCallback(
    (id: string) =>
      wrap(
        () => request(`/api/tasks/${id}`, { method: "DELETE" }),
        "Задача удалена",
      ),
    [wrap],
  );

  const addRoom = useCallback(
    (name: string, emoji: string) =>
      wrap(
        () =>
          request("/api/rooms", {
            method: "POST",
            body: JSON.stringify({ name, emoji }),
          }),
        "Комната добавлена",
      ),
    [wrap],
  );

  const updateRoom = useCallback(
    (id: string, patch: { name?: string; emoji?: string }) =>
      wrap(() =>
        request(`/api/rooms/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        }),
      ),
    [wrap],
  );

  const deleteRoom = useCallback(
    (id: string) =>
      wrap(
        () => request(`/api/rooms/${id}`, { method: "DELETE" }),
        "Комната удалена, задачи откреплены",
      ),
    [wrap],
  );

  const addExpense = useCallback(
    (input: NewExpenseInput) =>
      wrap(
        () =>
          request("/api/expenses", {
            method: "POST",
            body: JSON.stringify(input),
          }),
        "Расход записан",
      ),
    [wrap],
  );

  const deleteExpense = useCallback(
    (id: string) =>
      wrap(
        () => request(`/api/expenses/${id}`, { method: "DELETE" }),
        "Расход удалён",
      ),
    [wrap],
  );

  const saveBudget = useCallback(
    (monthlyBudget: number) =>
      wrap(
        () =>
          request("/api/settings", {
            method: "PUT",
            body: JSON.stringify({ monthlyBudget }),
          }),
        "Бюджет обновлён",
      ),
    [wrap],
  );

  const addInventoryItem = useCallback(
    (input: NewInventoryItemInput) =>
      wrap(
        () =>
          request("/api/inventory", {
            method: "POST",
            body: JSON.stringify(input),
          }),
        "Вещь добавлена в инвентарь",
        refreshInventory,
      ),
    [wrap, refreshInventory],
  );

  const updateInventoryItem = useCallback(
    (id: string, patch: Partial<NewInventoryItemInput>) =>
      wrap(
        () =>
          request(`/api/inventory/${id}`, {
            method: "PATCH",
            body: JSON.stringify(patch),
          }),
        "Инвентарь обновлён",
        refreshInventory,
      ),
    [wrap, refreshInventory],
  );

  const deleteInventoryItem = useCallback(
    (id: string) =>
      wrap(
        () => request(`/api/inventory/${id}`, { method: "DELETE" }),
        "Вещь удалена из инвентаря",
        refreshInventory,
      ),
    [wrap, refreshInventory],
  );

  return {
    data,
    inventory,
    loading,
    error,
    refresh,
    refreshInventory,
    addTask,
    updateTask,
    deleteTask,
    addRoom,
    updateRoom,
    deleteRoom,
    addExpense,
    deleteExpense,
    saveBudget,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
  };
}

export type HouseApi = ReturnType<typeof useHouse>;
