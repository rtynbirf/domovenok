// Экспорт журнала трат в CSV: Excel-дружелюбный (BOM + разделитель «;»).
import { expensesToCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { ensureSeed } from "@/lib/house";
import { isExpenseCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const expenses = await db.expense.findMany({ orderBy: { date: "desc" } });

  const csv = expensesToCsv(
    expenses.map((e) => ({
      title: e.title,
      amount: e.amount,
      category: isExpenseCategory(e.category) ? e.category : "other",
      date: e.date.toISOString(),
    })),
  );

  const filename = `domovenok-traty-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
