// Юнит-тесты повторяющихся дел: следующая дата, подписи, валидность.
import { describe, expect, it } from "vitest";
import { computeNextDue, isRecurring, repeatLabel } from "@/lib/recurring";

const NOW = new Date("2026-11-10T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

describe("isRecurring", () => {
  it("3 дня — регулярная", () => {
    expect(isRecurring(3)).toBe(true);
  });

  it("null, ноль, дробь и больше года — не регулярная", () => {
    expect(isRecurring(null)).toBe(false);
    expect(isRecurring(0)).toBe(false);
    expect(isRecurring(1.5)).toBe(false);
    expect(isRecurring(400)).toBe(false);
  });
});

describe("computeNextDue", () => {
  it("обычный случай: якорь + шаг", () => {
    const anchor = new Date(NOW.getTime() + DAY);
    const next = computeNextDue(anchor, 7, NOW);
    expect(next.getTime()).toBe(anchor.getTime() + 7 * DAY);
  });

  it("просроченную неделю не копим: перекатываем вперёд до будущего", () => {
    const anchor = new Date("2026-11-01T09:00:00.000Z"); // давно просрочена
    const next = computeNextDue(anchor, 7, NOW);
    // 8 и 15 ноября были бы «сейчас или в прошлом»? 8-е — в прошлом, 15-е — будущее
    expect(next.toISOString()).toBe("2026-11-15T09:00:00.000Z");
  });

  it("мусорный шаг притягивается к границам и не ломает расчёт", () => {
    const anchor = new Date(NOW.getTime() + DAY);
    expect(computeNextDue(anchor, 0.4, NOW).getTime()).toBe(anchor.getTime() + DAY);
    expect(computeNextDue(anchor, 9999, NOW).getTime()).toBe(anchor.getTime() + 365 * DAY);
  });
});

describe("repeatLabel", () => {
  it("человеческие подписи для частых интервалов", () => {
    expect(repeatLabel(1)).toBe("каждый день");
    expect(repeatLabel(7)).toBe("каждую неделю");
    expect(repeatLabel(30)).toBe("каждый месяц");
    expect(repeatLabel(3)).toBe("каждые 3 дн.");
  });

  it("невалидный интервал — пустая подпись", () => {
    expect(repeatLabel(0)).toBe("");
    expect(repeatLabel(1.5)).toBe("");
  });
});
