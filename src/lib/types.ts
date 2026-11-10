// Общие типы и справочники «Домовёнка»

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type ExpenseCategory =
  | "groceries"
  | "supplies"
  | "repairs"
  | "utilities"
  | "tech"
  | "other";

export const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "done"];
export const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "groceries",
  "supplies",
  "repairs",
  "utilities",
  "tech",
  "other",
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Надо сделать",
  doing: "В работе",
  done: "Готово",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  groceries: "Продукты",
  supplies: "Бытовая химия",
  repairs: "Ремонт",
  utilities: "Коммуналка",
  tech: "Техника",
  other: "Прочее",
};

export const CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  groceries: "🛒",
  supplies: "🧴",
  repairs: "🔧",
  utilities: "💡",
  tech: "🔌",
  other: "📦",
};

// Типы, приходящие с сервера (JSON-сериализованные даты)
export interface RoomDTO {
  id: string;
  name: string;
  emoji: string;
  sortOrder: number;
}

export interface TaskDTO {
  id: string;
  title: string;
  roomId: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  completedAt: string | null;
  repeatDays: number | null; // каждый N дней — регулярное дело, null — разовое
  createdAt: string;
  updatedAt: string;
  room?: RoomDTO | null;
}

export interface ExpenseDTO {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  createdAt: string;
}

// Вещь домашнего инвентаря (зеркало модели InventoryItem из Prisma)
export interface InventoryItemDTO {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string;
  minQuantity: number | null; // порог «докупить», null — не следим
  location: string | null; // место хранения
  price: number | null;
  purchaseDate: string | null;
  receiptImage: string | null; // фото чека, data URL (png/jpeg/webp)
  createdAt: string;
}

export interface HouseStats {
  homeIndex: number;
  openTasks: number;
  overdueTasks: number;
  doneThisMonth: number;
  monthSpent: number;
  budget: number;
  budgetLeft: number;
  overBudget: boolean;
  byCategory: { category: ExpenseCategory; label: string; total: number }[];
  statusCounts: Record<TaskStatus, number>;
  healthyRooms: number;
  totalRooms: number;
}

export interface Bootstrap {
  rooms: RoomDTO[];
  tasks: TaskDTO[];
  expenses: ExpenseDTO[];
  stats: HouseStats;
  generatedAt: string;
}

export function isTaskStatus(v: unknown): v is TaskStatus {
  return typeof v === "string" && TASK_STATUSES.includes(v as TaskStatus);
}

export function isTaskPriority(v: unknown): v is TaskPriority {
  return typeof v === "string" && TASK_PRIORITIES.includes(v as TaskPriority);
}

export function isExpenseCategory(v: unknown): v is ExpenseCategory {
  return typeof v === "string" && EXPENSE_CATEGORIES.includes(v as ExpenseCategory);
}

export function formatRub(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}
