// Вещь инвентаря: изменение и удаление.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { receiptImageIssue } from "@/lib/inventory";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1, "Название не может быть пустым").max(200).optional(),
  category: z.string().trim().max(60).nullable().optional(),
  quantity: z
    .number({ message: "Количество должно быть числом" })
    .min(0, "Количество не может быть отрицательным")
    .max(1_000_000, "Слишком большое количество для домашнего инвентаря")
    .optional(),
  unit: z.string().trim().min(1, "Укажите единицу измерения").max(20).optional(),
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы" },
      { status: 400 },
    );
  }

  const existing = await db.inventoryItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Вещь не найдена" }, { status: 404 });
  }

  const data: {
    name?: string;
    category?: string | null;
    quantity?: number;
    unit?: string;
    minQuantity?: number | null;
    location?: string | null;
    price?: number | null;
    purchaseDate?: Date | null;
    receiptImage?: string | null;
  } = {};

  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.category !== undefined) data.category = parsed.data.category || null;
  if (parsed.data.quantity !== undefined) data.quantity = parsed.data.quantity;
  if (parsed.data.unit !== undefined) data.unit = parsed.data.unit;
  if (parsed.data.minQuantity !== undefined) data.minQuantity = parsed.data.minQuantity;
  if (parsed.data.location !== undefined) data.location = parsed.data.location || null;
  if (parsed.data.price !== undefined) data.price = parsed.data.price;

  if (parsed.data.purchaseDate !== undefined) {
    if (parsed.data.purchaseDate === null) {
      data.purchaseDate = null;
    } else {
      const d = new Date(parsed.data.purchaseDate);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Некорректная дата покупки" }, { status: 400 });
      }
      data.purchaseDate = d;
    }
  }

  // Фото чека: null — убрать фото, строка — заменить (проверяем формат и размер).
  if (parsed.data.receiptImage !== undefined) {
    if (parsed.data.receiptImage === null || parsed.data.receiptImage === "") {
      data.receiptImage = null;
    } else {
      const issue = receiptImageIssue(parsed.data.receiptImage);
      if (issue) {
        return NextResponse.json({ error: issue }, { status: 400 });
      }
      data.receiptImage = parsed.data.receiptImage;
    }
  }

  const item = await db.inventoryItem.update({ where: { id }, data });
  return NextResponse.json({ item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await db.inventoryItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Вещь не найдена" }, { status: 404 });
  }
  await db.inventoryItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
