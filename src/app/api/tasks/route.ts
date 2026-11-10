// Задачи: список и создание.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureSeed } from "@/lib/house";
import { isTaskPriority, isTaskStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1, "Название не может быть пустым").max(200),
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

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  await ensureSeed();
  const tasks = await db.task.findMany({
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: { room: true },
  });
  return NextResponse.json({ tasks });
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

  const { title, roomId, priority, status, dueDate, repeatDays } = parsed.data;

  if (roomId) {
    const room = await db.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ error: "Такая комната не найдена" }, { status: 400 });
    }
  }

  const created = await db.task.create({
    data: {
      title,
      roomId: roomId ?? null,
      priority: isTaskPriority(priority) ? priority : "medium",
      status: isTaskStatus(status) && status !== "done" ? status : "todo",
      dueDate: parseDate(dueDate),
      repeatDays: repeatDays ?? null,
    },
    include: { room: true },
  });

  return NextResponse.json({ task: created }, { status: 201 });
}
