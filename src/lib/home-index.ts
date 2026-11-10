// Чистая логика «Индекса порядка дома» — покрыта юнит-тестами (tests/unit).
// Никаких зависимостей от БД и сети: только входные данные -> число.

import {
  CATEGORY_LABELS,
  type ExpenseCategory,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";

export interface IndexTaskInput {
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | Date | null;
}

export interface IndexInput {
  tasks: IndexTaskInput[];
  roomsTotal: number;
  monthSpent: number;
  budget: number;
  now?: Date;
}

const PENALTY_PER_OPEN = 2;
const PENALTY_OPEN_CAP = 30;
const PENALTY_PER_OVERDUE = 6;
const PENALTY_OVERDUE_CAP = 36;
const PENALTY_OVER_BUDGET_CAP = 20;
const BONUS_HEALTHY_ROOM_CAP = 10;
const BONUS_PER_HEALTHY_ROOM = 2;

export function isOverdue(
  task: { status: string; dueDate: string | Date | null },
  now: Date = new Date(),
): boolean {
  if (task.status === "done") return false;
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < now.getTime();
}

export function isOpen(task: { status: string }): boolean {
  return task.status !== "done";
}

/**
 * Индекс порядка дома, 0–100.
 *
 * Складывается из:
 *  - штраф за каждую открытую задачу (-2, максимум -30);
 *  - штраф за каждую просроченную (-6, максимум -36);
 *  - штраф за перерасход бюджета (до -20);
 *  - бонус за комнаты без открытых задач (+2 за комнату, максимум +10).
 */
export function computeHomeIndex(input: IndexInput): number {
  const now = input.now ?? new Date();
  let score = 100;

  const open = input.tasks.filter(isOpen);
  const overdue = input.tasks.filter((t) => isOverdue(t, now));

  score -= Math.min(PENALTY_OPEN_CAP, open.length * PENALTY_PER_OPEN);
  score -= Math.min(PENALTY_OVERDUE_CAP, overdue.length * PENALTY_PER_OVERDUE);

  if (input.budget > 0 && input.monthSpent > input.budget) {
    const overPercent = ((input.monthSpent - input.budget) / input.budget) * 100;
    score -= Math.min(PENALTY_OVER_BUDGET_CAP, Math.ceil(overPercent / 5));
  }

  if (input.roomsTotal > 0) {
    const roomsWithOpenTasks = new Set(
      open
        .map((t) => ("roomId" in t ? (t as { roomId?: string | null }).roomId : null))
        .filter((id): id is string => Boolean(id)),
    ).size;
    const healthy = Math.max(0, input.roomsTotal - roomsWithOpenTasks);
    score += Math.min(BONUS_HEALTHY_ROOM_CAP, healthy * BONUS_PER_HEALTHY_ROOM);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function homeIndexVerdict(score: number): { label: string; emoji: string } {
  if (score >= 90) return { label: "Дом сияет", emoji: "✨" };
  if (score >= 75) return { label: "Порядок!", emoji: "🏡" };
  if (score >= 50) return { label: "Есть над чем поработать", emoji: "🧹" };
  if (score >= 25) return { label: "Запущенно", emoji: "🌪️" };
  return { label: "Тревога, хозяин!", emoji: "🚨" };
}

export function categoryTotals(
  expenses: { amount: number; category: string }[],
): Map<ExpenseCategory, number> {
  const totals = new Map<ExpenseCategory, number>();
  for (const e of expenses) {
    const cat = (e.category as ExpenseCategory) in CATEGORY_LABELS
      ? (e.category as ExpenseCategory)
      : "other";
    totals.set(cat, (totals.get(cat) ?? 0) + e.amount);
  }
  return totals;
}

/** Первая и последняя дата текущего месяца по местному времени. */
export function monthRange(now: Date = new Date()): { from: Date; to: Date } {
  const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { from, to };
}

export function formatDay(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(d);
}
