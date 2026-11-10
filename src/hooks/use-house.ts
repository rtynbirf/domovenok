"use client";

// Центральный хук данных хозяйства: одна загрузка bootstrap + мутации с обновлением.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Bootstrap, ExpenseCategory, TaskPriority, TaskStatus } from "@/lib/types";

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

export function useHouse() {
  const [data, setData] = useState<Bootstrap | null>(null);
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

  useEffect(() => {
    refresh();
  }, [refresh]);

  const wrap = useCallback(
    async (fn: () => Promise<unknown>, successMessage?: string) => {
      try {
        await fn();
        await refresh();
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

  return {
    data,
    loading,
    error,
    refresh,
    addTask,
    updateTask,
    deleteTask,
    addRoom,
    updateRoom,
    deleteRoom,
    addExpense,
    deleteExpense,
    saveBudget,
  };
}

export type HouseApi = ReturnType<typeof useHouse>;
