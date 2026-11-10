// Чистая логика повторяющихся дел: когда у задачи следующее повторение.

const DAY_MS = 24 * 60 * 60 * 1000;

export const MIN_REPEAT_DAYS = 1;
export const MAX_REPEAT_DAYS = 365;

/** Регулярна ли задача: repeatDays — целое число от 1 до 365. */
export function isRecurring(
  repeatDays: number | null | undefined,
): repeatDays is number {
  return (
    typeof repeatDays === "number" &&
    Number.isInteger(repeatDays) &&
    repeatDays >= MIN_REPEAT_DAYS &&
    repeatDays <= MAX_REPEAT_DAYS
  );
}

/** Дата следующего повторения: от якоря (срок или момент завершения) шагами
 *  по repeatDays, пока не перегоним «сейчас» — просрочки не копим. */
export function computeNextDue(anchor: Date, repeatDays: number, now: Date): Date {
  const safeDays = Math.min(
    MAX_REPEAT_DAYS,
    Math.max(MIN_REPEAT_DAYS, Math.round(repeatDays)),
  );
  const step = safeDays * DAY_MS;
  let next = anchor.getTime() + step;
  while (next <= now.getTime()) next += step;
  return new Date(next);
}

/** Подпись для человека: «каждый день», «каждую неделю», «каждые 3 дн.». */
export function repeatLabel(repeatDays: number): string {
  if (!isRecurring(repeatDays)) return "";
  if (repeatDays === 1) return "каждый день";
  if (repeatDays === 7) return "каждую неделю";
  if (repeatDays === 30) return "каждый месяц";
  return `каждые ${repeatDays} дн.`;
}
