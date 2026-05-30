import { NextResponse } from "next/server";
import { ENGINE_URL } from "@/lib/constants";

export async function POST() {
  try {
    const res = await fetch(`${ENGINE_URL}/reset`, { method: "POST" });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ status: "reset" });
  }
}
