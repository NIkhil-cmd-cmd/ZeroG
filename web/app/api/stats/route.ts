import { NextResponse } from "next/server";
import { ENGINE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const res = await fetch(`${ENGINE_URL}/stats`, { cache: "no-store" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
