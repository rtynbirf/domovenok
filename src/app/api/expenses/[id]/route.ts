// Расход: удаление.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await db.expense.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Расход не найден" }, { status: 404 });
  }
  await db.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
