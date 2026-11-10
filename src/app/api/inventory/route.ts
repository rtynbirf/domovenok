// Инвентарь дома: список и создание вещей.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureSeed } from "@/lib/house";
import { receiptImageIssue } from "@/lib/inventory";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1, "Название не может быть пустым").max(200),
  category: z.string().trim().max(60).nullable().optional(),
  quantity: z
    .number({ message: "Количество должно быть числом" })
    .min(0, "Количество не может быть отрицательным")
    .max(1_000_000, "Слишком большое количество для домашнего инвентаря"),
  unit: z.string().trim().min(1, "Укажите единицу измерения").max(20),
  minQuantity: z
    .number({ message: "Минимальный запас должен быть числом" })
    .min(0, "Минимальный запас не может быть отрицательным")
    .max(1_000_000, "Слишком большой минимальный запас")
    .nullable()
    .optional(),
  location: z.string().trim().max(120).nullable().optional(),
  price: z
    .number({ message: "Цена должна быть числом" })
    .min(0, "Цена не может быть отрицательной")
    .max(100_000_000, "Слишком крупная цена для домашней вещи")
    .nullable()
    .optional(),
  purchaseDate: z.string().nullable().optional(),
  receiptImage: z.string().nullable().optional(),
});

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Фото чека: пустая строка — «нет фото», иначе проверяем формат и размер. */
function parseReceiptImage(value: string | null | undefined) {
  const normalized = value === "" ? null : value;
  const issue = receiptImageIssue(normalized);
  return { normalized, issue };
}

export async function GET() {
  await ensureSeed();
  const items = await db.inventoryItem.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
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

  const {
    name,
    category,
    quantity,
    unit,
    minQuantity,
    location,
    price,
    purchaseDate,
    receiptImage,
  } = parsed.data;

  const receipt = parseReceiptImage(receiptImage);
  if (receipt.issue) {
    return NextResponse.json({ error: receipt.issue }, { status: 400 });
  }

  if (purchaseDate) {
    const d = new Date(purchaseDate);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Некорректная дата покупки" }, { status: 400 });
    }
  }

  const item = await db.inventoryItem.create({
    data: {
      name,
      category: category || null,
      quantity,
      unit,
      minQuantity: minQuantity ?? null,
      location: location || null,
      price: price ?? null,
      purchaseDate: parseDate(purchaseDate),
      receiptImage: receipt.normalized ?? null,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
