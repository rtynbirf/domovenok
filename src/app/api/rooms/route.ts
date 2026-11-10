// Комнаты: список и создание.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureSeed } from "@/lib/house";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1, "Название не может быть пустым").max(60),
  emoji: z.string().trim().min(1).max(8).optional(),
});

export async function GET() {
  await ensureSeed();
  const rooms = await db.room.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ rooms });
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

  const maxOrder = await db.room.aggregate({ _max: { sortOrder: true } });

  try {
    const room = await db.room.create({
      data: {
        name: parsed.data.name,
        emoji: parsed.data.emoji || "🏠",
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });
    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Комната с таким названием уже есть" },
        { status: 409 },
      );
    }
    throw error;
  }
}
