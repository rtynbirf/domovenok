// Задача: изменение и удаление.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isTaskPriority, isTaskStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  roomId: z.string().min(1).nullable().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  dueDate: z.string().nullable().optional(),
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

  const existing = await db.task.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  const data: {
    title?: string;
    roomId?: string | null;
    priority?: string;
    status?: string;
    dueDate?: Date | null;
    completedAt?: Date | null;
  } = {};

  if (parsed.data.title !== undefined) data.title = parsed.data.title;

  if (parsed.data.roomId !== undefined) {
    if (parsed.data.roomId === null) {
      data.roomId = null;
    } else {
      const room = await db.room.findUnique({ where: { id: parsed.data.roomId } });
      if (!room) {
        return NextResponse.json({ error: "Такая комната не найдена" }, { status: 400 });
      }
      data.roomId = parsed.data.roomId;
    }
  }

  if (parsed.data.priority !== undefined) {
    if (!isTaskPriority(parsed.data.priority)) {
      return NextResponse.json({ error: "Неизвестный приоритет" }, { status: 400 });
    }
    data.priority = parsed.data.priority;
  }

  if (parsed.data.dueDate !== undefined) {
    if (parsed.data.dueDate === null) {
      data.dueDate = null;
    } else {
      const d = new Date(parsed.data.dueDate);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
      }
      data.dueDate = d;
    }
  }

  if (parsed.data.status !== undefined) {
    if (!isTaskStatus(parsed.data.status)) {
      return NextResponse.json({ error: "Неизвестный статус" }, { status: 400 });
    }
    data.status = parsed.data.status;
    data.completedAt =
      parsed.data.status === "done"
        ? (existing.completedAt ?? new Date())
        : null;
  }

  const task = await db.task.update({
    where: { id },
    data,
    include: { room: true },
  });

  return NextResponse.json({ task });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await db.task.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }
  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
