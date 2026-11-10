// Чистая логика CSV-экспорта: без внешних зависимостей, покрыта юнит-тестами.
// Excel в русской локали открывает «;» нативно, BOM помогает ему с кириллицей.

import { CATEGORY_LABELS, type ExpenseCategory } from "./types";

export const CSV_DELIMITER = ";";
export const CSV_BOM = "\uFEFF";
export const CSV_EOL = "\r\n";

/** Экранирует поле по RFC 4180: кавычки удваиваются,
 *  поля с разделителем, кавычками или переносами берутся в кавычки. */
export function escapeCsvField(value: string): string {
  const needsQuotes =
    value.includes('"') ||
    value.includes(CSV_DELIMITER) ||
    value.includes("\n") ||
    value.includes("\r");
  const escaped = value.replaceAll('"', '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

/** Строит CSV-документ из шапки и строк: BOM + CRLF, как любит Excel. */
export function rowsToCsv(header: string[], rows: string[][]): string {
  const lines = [header, ...rows].map((row) => row.map(escapeCsvField).join(CSV_DELIMITER));
  return CSV_BOM + lines.join(CSV_EOL) + CSV_EOL;
}

/** Трата в том виде, в каком она попадает в CSV. */
export interface CsvExpense {
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // ISO
}

const EXPENSES_HEADER = ["Дата", "Категория", "Название", "Сумма, ₽"];

function toIsoDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** Журнал трат → CSV-документ: дата, категория по-русски, название, сумма. */
export function expensesToCsv(expenses: CsvExpense[]): string {
  const rows = expenses.map((e) => [
    toIsoDate(e.date),
    CATEGORY_LABELS[e.category],
    e.title,
    String(e.amount),
  ]);
  return rowsToCsv(EXPENSES_HEADER, rows);
}
