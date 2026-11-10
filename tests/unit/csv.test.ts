// Юнит-тесты CSV-экспорта: экранирование, BOM, строки журнала трат.
import { describe, expect, it } from "vitest";
import { CSV_BOM, CSV_DELIMITER, escapeCsvField, expensesToCsv, rowsToCsv } from "@/lib/csv";

describe("escapeCsvField", () => {
  it("простое значение остаётся без изменений", () => {
    expect(escapeCsvField("Шторы")).toBe("Шторы");
  });

  it("значение с разделителем берётся в кавычки", () => {
    expect(escapeCsvField(`краска${CSV_DELIMITER}белая`)).toBe('"краска;белая"');
  });

  it("кавычки удваиваются и поле берётся в кавычки", () => {
    expect(escapeCsvField('люстра "Луна"')).toBe('"люстра ""Луна"""');
  });

  it("перенос строки внутри поля — поле в кавычках", () => {
    expect(escapeCsvField("строка\nещё")).toBe('"строка\nещё"');
  });

  it("возврат каретки тоже требует кавычек", () => {
    expect(escapeCsvField("строка\rещё")).toBe('"строка\rещё"');
  });
});

describe("rowsToCsv", () => {
  it("начинается с BOM — Excel поймёт UTF-8 и кириллицу", () => {
    const csv = rowsToCsv(["А"], [["б"]]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
  });

  it("шапка и строка склеены разделителем, документ заканчивается CRLF", () => {
    const csv = rowsToCsv(["Дата", "Сумма"], [["2026-11-10", "500"]]);
    expect(csv).toBe(`${CSV_BOM}Дата;Сумма\r\n2026-11-10;500\r\n`);
  });
});

describe("expensesToCsv", () => {
  it("пустой журнал — документ только с шапкой", () => {
    const csv = expensesToCsv([]);
    expect(csv).toBe(`${CSV_BOM}Дата;Категория;Название;Сумма, ₽\r\n`);
  });

  it("строка траты: дата без времени, категория по-русски, сумма числом", () => {
    const csv = expensesToCsv([
      { title: "Шторы", amount: 1200, category: "supplies", date: "2026-11-05T12:00:00.000Z" },
    ]);
    expect(csv).toBe(`${CSV_BOM}Дата;Категория;Название;Сумма, ₽\r\n2026-11-05;Бытовая химия;Шторы;1200\r\n`);
  });

  it("название с разделителем не ломает колонки", () => {
    const csv = expensesToCsv([
      { title: "краска;белая", amount: 300, category: "other", date: "2026-11-01T12:00:00.000Z" },
    ]);
    expect(csv).toContain('"краска;белая"');
  });

  it("мусорная дата не роняет экспорт — просто пустая ячейка", () => {
    const csv = expensesToCsv([
      { title: "тест", amount: 1, category: "other", date: "не дата" },
    ]);
    expect(csv).toContain(";Прочее;тест;1");
  });
});
