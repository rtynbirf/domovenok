// Единый источник данных для интерфейса: комнаты + задачи + расходы + сводка.
import { NextResponse } from "next/server";
import { getBootstrapData } from "@/lib/house";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getBootstrapData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("bootstrap failed:", error);
    return NextResponse.json(
      { error: "Не удалось собрать данные дома. Попробуйте обновить страницу." },
      { status: 500 },
    );
  }
}
