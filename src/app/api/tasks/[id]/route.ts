// Задача: изменение и удаление.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { computeNextDue, isRecurring } from "@/lib/recurring";
import { isTaskPriority, isTaskStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  roomId: z.string().min(1).nullable().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  repeatDays: z
    .number({ message: "Повтор должен быть числом дней" })
    .int("Повтор — целое число дней")
    .min(1, "Повтор — минимум один день")
    .max(365, "Повтор — не чаще раза в год")
    .nullable()
    .optional(),
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
    repeatDays?: number | null;
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

  if (parsed.data.repeatDays !== undefined) {
    data.repeatDays = parsed.data.repeatDays;
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

  const now = new Date();
  const statusBecameDone = parsed.data.status === "done" && existing.status !== "done";
  // Какой интервал повтора действует после этого PATCH (учитываем правку в том же запросе)
  const effectiveRepeat =
    parsed.data.repeatDays !== undefined ? parsed.data.repeatDays : existing.repeatDays;

  const task = await db.task.update({
    where: { id },
    data,
    include: { room: true },
  });

  // Регулярное дело завершено — возникает следующее повторение, история остаётся.
  let spawned: Awaited<ReturnType<typeof db.task.create>> | null = null;
  if (statusBecameDone && isRecurring(effectiveRepeat)) {
    const anchor = existing.dueDate ?? task.completedAt ?? now;
    spawned = await db.task.create({
      data: {
        title: task.title,
        roomId: task.roomId,
        priority: task.priority,
        status: "todo",
        dueDate: computeNextDue(anchor, effectiveRepeat, now),
        repeatDays: effectiveRepeat,
      },
      include: { room: true },
    });
  }

  return NextResponse.json(spawned ? { task, spawned } : { task });
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
