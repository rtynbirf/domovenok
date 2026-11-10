// Настройки хозяйства: месячный бюджет.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getBudget, setBudget } from "@/lib/house";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  monthlyBudget: z
    .number({ message: "Бюджет должен быть числом" })
    .int("Целые рубли, пожалуйста")
    .positive("Бюджет должен быть больше нуля")
    .max(10_000_000),
});

export async function GET() {
  const monthlyBudget = await getBudget();
  return NextResponse.json({ monthlyBudget });
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы" },
      { status: 400 },
    );
  }

  await setBudget(parsed.data.monthlyBudget);
  const monthlyBudget = await getBudget();
  return NextResponse.json({ monthlyBudget });
}
