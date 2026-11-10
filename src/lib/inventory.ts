// Чистая логика инвентаря: минимумы запасов, фото чеков, форматирование.
// Никаких зависимостей от БД, сети и DOM — покрыто юнит-тестами (tests/unit).

/** Единицы измерения для выбора в форме инвентаря. */
export const UNIT_OPTIONS = ["шт", "кг", "г", "л", "мл", "уп"] as const;
export type InventoryUnit = (typeof UNIT_OPTIONS)[number];

/** Максимальная длина строки data URL фото чека (~1.5 МБ после base64). */
export const MAX_RECEIPT_IMAGE_LENGTH = 2_100_000;

const RECEIPT_IMAGE_PATTERN = /^data:image\/(png|jpeg|jpg|webp);base64,/;

/**
 * Пора ли докупать: только когда минимальный запас задан (конечное число,
 * включая ноль) и запас опустился до него или ниже. Без минимума — не следим.
 */
export function isLowStock(
  quantity: number,
  minQuantity: number | null | undefined,
): boolean {
  if (typeof minQuantity !== "number") return false;
  if (!Number.isFinite(minQuantity)) return false;
  return quantity <= minQuantity;
}

/**
 * Проверка фото чека (data URL): возвращает текст ошибки по-русски
 * или null, если фото корректно (в том числе когда его просто нет).
 */
export function receiptImageIssue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") {
    return "Фото чека должно быть изображением в формате data URL";
  }
  if (!RECEIPT_IMAGE_PATTERN.test(value)) {
    return "Фото чека должно быть файлом PNG, JPEG или WebP";
  }
  if (value.length > MAX_RECEIPT_IMAGE_LENGTH) {
    return "Фото чека слишком большое — выберите снимок поменьше (до ~1.5 МБ)";
  }
  return null;
}

/** «2 шт», «1,5 кг» — количество без лишних нулей и с русской запятой. */
export function formatQuantity(quantity: number, unit: string): string {
  const safe = Number.isFinite(quantity) ? quantity : 0;
  const text = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 3,
  }).format(safe);
  return `${text} ${unit}`;
}

/** Цена в рублях: «1 599 ₽», дробные копейки — до двух знаков; пусто — «—». */
export function formatPrice(price: number | null | undefined): string {
  if (typeof price !== "number" || !Number.isFinite(price)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}
