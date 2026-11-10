// Юнит-тесты инвентаря: минимумы запасов, фото чеков, форматирование.
import { describe, expect, it } from "vitest";
import {
  MAX_RECEIPT_IMAGE_LENGTH,
  UNIT_OPTIONS,
  formatPrice,
  formatQuantity,
  isLowStock,
  receiptImageIssue,
} from "@/lib/inventory";

const PNG_PREFIX_LENGTH = "data:image/png;base64,".length;

describe("isLowStock", () => {
  it("обычный случай: запас выше минимума — не докупаем", () => {
    expect(isLowStock(6, 5)).toBe(false);
    expect(isLowStock(10, 2)).toBe(false);
  });

  it("запас ниже минимума — пора докупать", () => {
    expect(isLowStock(2, 5)).toBe(true);
    expect(isLowStock(0.5, 1)).toBe(true);
  });

  it("minQuantity не задан — никогда не «докупить»", () => {
    expect(isLowStock(10, null)).toBe(false);
    expect(isLowStock(0, null)).toBe(false);
    expect(isLowStock(0, undefined)).toBe(false);
  });

  it("равенство запаса и минимума — уже «докупить»", () => {
    expect(isLowStock(5, 5)).toBe(true);
    expect(isLowStock(0, 0)).toBe(true);
  });

  it("нули: пустой запас при заданном минимальном — «докупить»", () => {
    expect(isLowStock(0, 3)).toBe(true);
    expect(isLowStock(3, 0)).toBe(false);
  });

  it("отрицательные значения сравниваются честно", () => {
    expect(isLowStock(-1, 0)).toBe(true);
    expect(isLowStock(-5, -2)).toBe(true);
    expect(isLowStock(1, -2)).toBe(false);
  });

  it("мусорный минимум (NaN/Infinity) — как незаданный", () => {
    expect(isLowStock(1, Number.NaN)).toBe(false);
    expect(isLowStock(1, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("мусорное количество не роняет проверку", () => {
    expect(isLowStock(Number.NaN, 5)).toBe(false);
  });
});

describe("receiptImageIssue", () => {
  const PNG = "data:image/png;base64,iVBORw0KGgo=";
  const JPEG = "data:image/jpeg;base64,/9j/4AAQ";
  const JPG = "data:image/jpg;base64,/9j/4AAQ";
  const WEBP = "data:image/webp;base64,UklGRhIA";

  it("нет фото — ошибки нет (фото необязательно)", () => {
    expect(receiptImageIssue(null)).toBeNull();
    expect(receiptImageIssue(undefined)).toBeNull();
    expect(receiptImageIssue("")).toBeNull();
  });

  it("допустимые форматы: png, jpeg, jpg, webp", () => {
    expect(receiptImageIssue(PNG)).toBeNull();
    expect(receiptImageIssue(JPEG)).toBeNull();
    expect(receiptImageIssue(JPG)).toBeNull();
    expect(receiptImageIssue(WEBP)).toBeNull();
  });

  it("чужие форматы и не-data-URL отвергаются", () => {
    expect(receiptImageIssue("data:image/gif;base64,R0lGOD")).toMatch(/PNG, JPEG или WebP/);
    expect(receiptImageIssue("data:text/plain;base64,SGk=")).toMatch(/PNG, JPEG или WebP/);
    expect(receiptImageIssue("https://example.com/check.png")).toMatch(/PNG, JPEG или WebP/);
    expect(receiptImageIssue("просто строка")).toMatch(/PNG, JPEG или WebP/);
  });

  it("не-строка отвергается", () => {
    expect(receiptImageIssue(42)).toMatch(/data URL/);
    expect(receiptImageIssue({})).toMatch(/data URL/);
  });

  it("слишком длинное фото отвергается с лимитом ~1.5 МБ", () => {
    const huge = `data:image/png;base64,${"A".repeat(MAX_RECEIPT_IMAGE_LENGTH)}`;
    expect(receiptImageIssue(huge)).toMatch(/слишком большое/);
  });

  it("фото на границе лимита ещё проходит", () => {
    const atLimit = `data:image/png;base64,${"A".repeat(MAX_RECEIPT_IMAGE_LENGTH - PNG_PREFIX_LENGTH)}`;
    expect(receiptImageIssue(atLimit)).toBeNull();
  });
});

describe("formatQuantity", () => {
  it("целые — без дробной части", () => {
    expect(formatQuantity(2, "шт")).toBe("2 шт");
    expect(formatQuantity(2.0, "шт")).toBe("2 шт");
    expect(formatQuantity(0, "л")).toBe("0 л");
  });

  it("дробные — с русской запятой и без лишних нулей", () => {
    expect(formatQuantity(1.5, "кг")).toBe("1,5 кг");
    expect(formatQuantity(2.75, "м")).toBe("2,75 м");
    expect(formatQuantity(0.125, "л")).toBe("0,125 л");
  });

  it("мусорное количество показываем как ноль", () => {
    expect(formatQuantity(Number.NaN, "шт")).toBe("0 шт");
    expect(formatQuantity(Number.POSITIVE_INFINITY, "кг")).toBe("0 кг");
  });
});

describe("formatPrice", () => {
  it("цена в рублях со знаком валюты", () => {
    expect(formatPrice(1599).endsWith("₽")).toBe(true);
    expect(formatPrice(1599)).toContain("599");
  });

  it("дробные копейки — до двух знаков", () => {
    expect(formatPrice(149.9)).toContain("149,9");
    expect(formatPrice(149.9).endsWith("₽")).toBe(true);
  });

  it("ноль — это ноль рублей", () => {
    expect(formatPrice(0)).toBe("0\u00A0₽");
  });

  it("цена не задана или мусорная — прочерк", () => {
    expect(formatPrice(null)).toBe("—");
    expect(formatPrice(undefined)).toBe("—");
    expect(formatPrice(Number.NaN)).toBe("—");
    expect(formatPrice(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("UNIT_OPTIONS", () => {
  it("справочник единиц не пуст и содержит базовые", () => {
    expect(UNIT_OPTIONS.length).toBeGreaterThan(0);
    expect(UNIT_OPTIONS).toContain("шт");
    expect(UNIT_OPTIONS).toContain("кг");
    expect(UNIT_OPTIONS).toContain("л");
    expect(UNIT_OPTIONS).toContain("уп");
  });
});
