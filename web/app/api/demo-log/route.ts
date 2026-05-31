import { NextResponse } from "next/server";
import { ENGINE_URL } from "@/lib/constants";

export async function GET() {
  try {
    const res = await fetch(`${ENGINE_URL}/demo/log`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ detail: "Engine unreachable" }, { status: 502 });
  }
}
