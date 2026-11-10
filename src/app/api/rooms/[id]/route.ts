// Комната: переименование и удаление. Задачи комнаты открепляются, но не теряются.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  emoji: z.string().trim().min(1).max(8).optional(),
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

  const existing = await db.room.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Комната не найдена" }, { status: 404 });
  }

  try {
    const room = await db.room.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.emoji !== undefined ? { emoji: parsed.data.emoji } : {}),
      },
    });
    return NextResponse.json({ room });
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await db.room.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Комната не найдена" }, { status: 404 });
  }
  await db.room.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
