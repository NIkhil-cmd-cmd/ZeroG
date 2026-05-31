import { NextResponse } from "next/server";
import { ENGINE_URL } from "@/lib/constants";

export async function POST() {
  const res = await fetch(`${ENGINE_URL}/reset`, { method: "POST" });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
