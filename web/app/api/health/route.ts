import { NextResponse } from "next/server";
import { ENGINE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch(`${ENGINE_URL}/health`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ status: "offline" }, { status: 503 });
  }
}
