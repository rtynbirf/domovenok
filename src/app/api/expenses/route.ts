// Расходы: список и добавление.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureSeed } from "@/lib/house";
import { isExpenseCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1, "Название не может быть пустым").max(200),
  amount: z
    .number({ message: "Сумма должна быть числом" })
    .int("Копейки пока не принимаем — целые рубли")
    .positive("Сумма должна быть больше нуля")
    .max(10_000_000, "Слишком крупная сумма для домашней кассы"),
  category: z.string().optional(),
  date: z.string().nullable().optional(),
});

export async function GET() {
  await ensureSeed();
  const expenses = await db.expense.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json({ expenses });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы" },
      { status: 400 },
    );
  }

  const { title, amount, category, date } = parsed.data;

  let dateValue: Date | null = null;
  if (date) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
    }
    dateValue = d;
  }

  const expense = await db.expense.create({
    data: {
      title,
      amount,
      category: isExpenseCategory(category) ? category : "other",
      ...(dateValue ? { date: dateValue } : {}),
    },
  });

  return NextResponse.json({ expense }, { status: 201 });
}
