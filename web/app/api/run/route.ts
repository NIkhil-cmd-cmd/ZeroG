import { NextRequest, NextResponse } from "next/server";
import { ENGINE_URL } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${ENGINE_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(data);
}
