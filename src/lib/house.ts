// Серверная логика хозяйства: автосид демо-данных и сводка (bootstrap).
import { db } from "@/lib/db";
import {
  computeHomeIndex,
  categoryTotals,
  isOverdue,
  isOpen,
  monthRange,
} from "@/lib/home-index";
import {
  CATEGORY_LABELS,
  type ExpenseCategory,
  type HouseStats,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";

const DEFAULT_BUDGET = "40000";

export async function getBudget(): Promise<number> {
  const s = await db.setting.findUnique({ where: { key: "monthlyBudget" } });
  const n = Number(s?.value);
  return Number.isFinite(n) && n > 0 ? n : Number(DEFAULT_BUDGET);
}

export async function setBudget(value: number): Promise<void> {
  await db.setting.upsert({
    where: { key: "monthlyBudget" },
    create: { key: "monthlyBudget", value: String(Math.round(value)) },
    update: { value: String(Math.round(value)) },
  });
}

export async function computeStats(): Promise<HouseStats> {
  const [tasks, expenses, roomsTotal, budget] = await Promise.all([
    db.task.findMany(),
    db.expense.findMany(),
    db.room.count(),
    getBudget(),
  ]);

  const now = new Date();
  const { from, to } = monthRange(now);

  const monthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d >= from && d < to;
  });
  const monthSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const totals = categoryTotals(monthExpenses);
  const byCategory = Array.from(totals.entries())
    .map(([category, total]) => ({
      category,
      label: CATEGORY_LABELS[category as ExpenseCategory] ?? CATEGORY_LABELS.other,
      total,
    }))
    .sort((a, b) => b.total - a.total);

  const openTasks = tasks.filter(isOpen);
  const overdueTasks = tasks.filter((t) => isOverdue(t, now));

  const statusCounts: Record<TaskStatus, number> = {
    todo: tasks.filter((t) => t.status === "todo").length,
    doing: tasks.filter((t) => t.status === "doing").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const roomsWithOpenTasks = new Set(
    openTasks.map((t) => t.roomId).filter((id): id is string => Boolean(id)),
  ).size;

  const homeIndex = computeHomeIndex({
    tasks: tasks.map((t) => ({
      status: t.status as TaskStatus,
      priority: t.priority as TaskPriority,
      dueDate: t.dueDate,
      roomId: t.roomId,
    })),
    roomsTotal,
    monthSpent,
    budget,
    now,
  });

  return {
    homeIndex,
    openTasks: openTasks.length,
    overdueTasks: overdueTasks.length,
    doneThisMonth: tasks.filter(
      (t) => t.completedAt && new Date(t.completedAt) >= from && new Date(t.completedAt) < to,
    ).length,
    monthSpent,
    budget,
    budgetLeft: budget - monthSpent,
    overBudget: budget > 0 && monthSpent > budget,
    byCategory,
    statusCounts,
    healthyRooms: Math.max(0, roomsTotal - roomsWithOpenTasks),
    totalRooms: roomsTotal,
  };
}

let seedPromise: Promise<void> | null = null;

/** Идемпотентный сид: наполняет дом демо-данными один раз, если он пуст. */
export async function ensureSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedOnce().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function seedOnce(): Promise<void> {
  const roomsCount = await db.room.count();
  if (roomsCount > 0) return;

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const at = (offsetDays: number) => new Date(now + offsetDays * day);

  const rooms = await Promise.all(
    [
      { name: "Кухня", emoji: "🍳", sortOrder: 1 },
      { name: "Гостиная", emoji: "🛋️", sortOrder: 2 },
      { name: "Спальня", emoji: "🛏️", sortOrder: 3 },
      { name: "Ванная", emoji: "🛁", sortOrder: 4 },
      { name: "Прихожая", emoji: "🚪", sortOrder: 5 },
      { name: "Балкон", emoji: "🌿", sortOrder: 6 },
    ].map((r) => db.room.create({ data: r })),
  );

  const roomId = (name: string) => rooms.find((r) => r.name === name)?.id ?? null;

  const tasks = [
    // Просроченные — чтобы было что «спасать»
    { title: "Разморозить холодильник", roomId: roomId("Кухня"), priority: "high", status: "todo", dueDate: at(-3) },
    { title: "Заменить лампочку в бра", roomId: roomId("Гостиная"), priority: "medium", status: "todo", dueDate: at(-1) },
    // Горящее и текущие
    { title: "Генеральная уборка перед гостями", roomId: roomId("Гостиная"), priority: "high", status: "doing", dueDate: at(1) },
    { title: "Помыть окна после дождей", roomId: roomId("Спальня"), priority: "low", status: "todo", dueDate: at(4) },
    { title: "Прочистить слив в ванне", roomId: roomId("Ванная"), priority: "high", status: "todo", dueDate: at(2) },
    { title: "Разобрать сезонную обувь", roomId: roomId("Прихожая"), priority: "medium", status: "doing", dueDate: at(5) },
    { title: "Полить и обрезать цветы", roomId: roomId("Балкон"), priority: "low", status: "todo", dueDate: at(3), repeatDays: 3 },
    { title: "Сменить фильтр вытяжки", roomId: roomId("Кухня"), priority: "medium", status: "todo", dueDate: at(7), repeatDays: 30 },
    { title: "Протереть зеркала и стёкла", roomId: roomId("Ванная"), priority: "low", status: "todo", dueDate: at(6) },
    // В работе без срока
    { title: "Перебрать аптечку, выбросить просрочку", roomId: null, priority: "medium", status: "doing", dueDate: null },
    { title: "Составить список дел на отпуск", roomId: null, priority: "low", status: "todo", dueDate: null },
    // Сделано
    { title: "Заказать фильтр для воды", roomId: roomId("Кухня"), priority: "medium", status: "done", dueDate: at(-2), completedAt: at(-1) },
    { title: "Стирка штор", roomId: roomId("Спальня"), priority: "medium", status: "done", dueDate: at(-4), completedAt: at(-3) },
    { title: "Пополнить запасы бытовой химии", roomId: null, priority: "low", status: "done", dueDate: at(-5), completedAt: at(-5) },
  ] as const;

  for (const t of tasks) {
    await db.task.create({
      data: {
        title: t.title,
        roomId: t.roomId,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate ?? null,
        completedAt: "completedAt" in t ? t.completedAt : null,
        repeatDays: "repeatDays" in t ? t.repeatDays : null,
      },
    });
  }

  const expenses = [
    { title: "Продукты на неделю", amount: 4250, category: "groceries", date: at(-1) },
    { title: "Овощи и фрукты на рынок", amount: 1830, category: "groceries", date: at(-6) },
    { title: "Гель для посудомойки", amount: 890, category: "supplies", date: at(-2) },
    { title: "Средства для мытья стёкол", amount: 460, category: "supplies", date: at(-9) },
    { title: "Вызов сантехника — смеситель", amount: 3500, category: "repairs", date: at(-8) },
    { title: "Крепёж для полок", amount: 720, category: "repairs", date: at(-12) },
    { title: "Электричество", amount: 2980, category: "utilities", date: at(-10) },
    { title: "Вода и водоотведение", amount: 1640, category: "utilities", date: at(-10) },
    { title: "Интернет и связь", amount: 750, category: "utilities", date: at(-14) },
    { title: "Новая лампа для спальни", amount: 2340, category: "tech", date: at(-4) },
    { title: "Увлажнитель воздуха", amount: 5990, category: "tech", date: at(-16) },
    { title: "Свечи и декор к празднику", amount: 1180, category: "other", date: at(-3) },
  ];

  for (const e of expenses) {
    await db.expense.create({
      data: {
        title: e.title.trim(),
        amount: e.amount,
        category: e.category,
        date: e.date,
      },
    });
  }

  await db.setting.upsert({
    where: { key: "monthlyBudget" },
    create: { key: "monthlyBudget", value: DEFAULT_BUDGET },
    update: {},
  });
}

export async function getBootstrapData() {
  await ensureSeed();
  const [rooms, tasks, expenses, stats] = await Promise.all([
    db.room.findMany({ orderBy: { sortOrder: "asc" } }),
    db.task.findMany({
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      include: { room: true },
    }),
    db.expense.findMany({ orderBy: { date: "desc" } }),
    computeStats(),
  ]);
  return { rooms, tasks, expenses, stats, generatedAt: new Date().toISOString() };
}
