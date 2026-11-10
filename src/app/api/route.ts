// Health-check «Домовёнка».
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "domovenok",
    house: "в порядке",
  });
}
