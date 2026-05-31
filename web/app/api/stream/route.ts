import { NextRequest } from "next/server";
import { ENGINE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get("run_id");
  if (!runId) {
    return new Response("Missing run_id", { status: 400 });
  }

  const res = await fetch(`${ENGINE_URL}/stream/${runId}`);
  if (!res.ok) {
    return new Response(await res.text(), { status: res.status });
  }
  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
