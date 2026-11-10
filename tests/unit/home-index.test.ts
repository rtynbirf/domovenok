// Юнит-тесты «Устава дома»: чистая логика индекса порядка.
import { describe, expect, it } from "vitest";
import {
  categoryTotals,
  computeHomeIndex,
  homeIndexVerdict,
  isOverdue,
  isOpen,
  monthRange,
} from "@/lib/home-index";
import { isExpenseCategory, isTaskPriority, isTaskStatus } from "@/lib/types";

const NOW = new Date("2026-11-10T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

interface Fixture {
  status: "todo" | "doing" | "done";
  priority: "low" | "medium" | "high";
  dueDate: Date | string | null;
  roomId: string | null;
}

const task = (overrides: Partial<Fixture> = {}): Fixture => ({
  status: "todo",
  priority: "medium",
  dueDate: null,
  roomId: null,
  ...overrides,
});

describe("isOverdue", () => {
  it("просрочена, если срок в прошлом и задача не готова", () => {
    expect(isOverdue({ status: "todo", dueDate: new Date(NOW.getTime() - DAY) }, NOW)).toBe(true);
  });

  it("готовая задача никогда не просрочена", () => {
    expect(isOverdue({ status: "done", dueDate: new Date(NOW.getTime() - DAY) }, NOW)).toBe(false);
  });

  it("без срока — не просрочена", () => {
    expect(isOverdue({ status: "todo", dueDate: null }, NOW)).toBe(false);
  });

  it("мусорная дата — не просрочена (не роняем расчёт)", () => {
    expect(isOverdue({ status: "todo", dueDate: "не дата" }, NOW)).toBe(false);
  });

  it("срок в будущем — не просрочена", () => {
    expect(isOverdue({ status: "todo", dueDate: new Date(NOW.getTime() + DAY) }, NOW)).toBe(false);
  });
});

describe("isOpen", () => {
  it("todo и doing открыты, done закрыта", () => {
    expect(isOpen({ status: "todo" })).toBe(true);
    expect(isOpen({ status: "doing" })).toBe(true);
    expect(isOpen({ status: "done" })).toBe(false);
  });
});

describe("computeHomeIndex", () => {
  it("идеальный дом — 100", () => {
    const score = computeHomeIndex({
      tasks: [],
      roomsTotal: 0,
      monthSpent: 0,
      budget: 40000,
      now: NOW,
    });
    expect(score).toBe(100);
  });

  it("каждая открытая задача штрафует на 2", () => {
    const score = computeHomeIndex({
      tasks: [task(), task(), task()],
      roomsTotal: 0,
      monthSpent: 0,
      budget: 40000,
      now: NOW,
    });
    expect(score).toBe(94);
  });

  it("просроченные бьют сильнее: -2 как открытая и -6 как просроченная", () => {
    const score = computeHomeIndex({
      tasks: [task({ dueDate: new Date(NOW.getTime() - DAY) })],
      roomsTotal: 0,
      monthSpent: 0,
      budget: 40000,
      now: NOW,
    });
    expect(score).toBe(92);
  });

  it("перерасход бюджета на 50% штрафует на 10", () => {
    const score = computeHomeIndex({
      tasks: [],
      roomsTotal: 0,
      monthSpent: 60000,
      budget: 40000,
      now: NOW,
    });
    expect(score).toBe(90);
  });

  it("здоровые комнаты дают бонус, но не выше 100", () => {
    const score = computeHomeIndex({
      tasks: [task({ roomId: "kitchen" })],
      roomsTotal: 6,
      monthSpent: 0,
      budget: 40000,
      now: NOW,
    });
    // -2 за задачу, +10 бонуса за 5 здоровых комнат (максимум), итого 100
    expect(score).toBe(100);
  });

  it("штрафы капированы: 30 открытых, 36 просроченных, 20 за бюджет -> минимум 14", () => {
    const tasks = Array.from({ length: 30 }, () => task({ dueDate: new Date(NOW.getTime() - DAY) }));
    const score = computeHomeIndex({
      tasks,
      roomsTotal: 0,
      monthSpent: 200000,
      budget: 40000,
      now: NOW,
    });
    expect(score).toBe(14);
  });

  it("готовые задачи не штрафуют", () => {
    const score = computeHomeIndex({
      tasks: [task({ status: "done", dueDate: new Date(NOW.getTime() - DAY) })],
      roomsTotal: 0,
      monthSpent: 0,
      budget: 40000,
      now: NOW,
    });
    expect(score).toBe(100);
  });
});

describe("homeIndexVerdict", () => {
  it("подбирает вердикт по шкале", () => {
    expect(homeIndexVerdict(95).label).toBe("Дом сияет");
    expect(homeIndexVerdict(80).label).toBe("Порядок!");
    expect(homeIndexVerdict(60).label).toBe("Есть над чем поработать");
    expect(homeIndexVerdict(30).label).toBe("Запущенно");
    expect(homeIndexVerdict(5).label).toBe("Тревога, хозяин!");
  });
});

describe("categoryTotals", () => {
  it("суммирует по категориям", () => {
    const totals = categoryTotals([
      { amount: 100, category: "groceries" },
      { amount: 250, category: "groceries" },
      { amount: 90, category: "repairs" },
    ]);
    expect(totals.get("groceries")).toBe(350);
    expect(totals.get("repairs")).toBe(90);
  });

  it("неизвестная категория уходит в «Прочее»", () => {
    const totals = categoryTotals([{ amount: 77, category: "whatever" }]);
    expect(totals.get("other")).toBe(77);
  });
});

describe("monthRange", () => {
  it("обхватывает текущий месяц целиком", () => {
    const { from, to } = monthRange(new Date("2026-11-10T12:00:00.000Z"));
    expect(from.getFullYear()).toBe(2026);
    expect(from.getMonth()).toBe(10);
    expect(from.getDate()).toBe(1);
    expect(to.getFullYear()).toBe(2026);
    expect(to.getMonth()).toBe(11);
    expect(to.getDate()).toBe(1);
  });
});

describe("сторожевые проверки типов", () => {
  it("статусы, приоритеты и категории принимаются только из справочника", () => {
    expect(isTaskStatus("todo")).toBe(true);
    expect(isTaskStatus("done")).toBe(true);
    expect(isTaskStatus("cancelled")).toBe(false);
    expect(isTaskPriority("high")).toBe(true);
    expect(isTaskPriority("urgent")).toBe(false);
    expect(isExpenseCategory("groceries")).toBe(true);
    expect(isExpenseCategory("vacation")).toBe(false);
  });
});
