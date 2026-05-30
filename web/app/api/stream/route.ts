import { NextRequest } from "next/server";
import { ENGINE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const runId = req.nextUrl.searchParams.get("run_id");
  if (!runId) {
    return new Response("Missing run_id", { status: 400 });
  }

  if (runId.startsWith("sim-")) {
    const sim = globalThis.__zerogSim?.[runId];
    if (!sim) return new Response("Not found", { status: 404 });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for (const event of sim.events) {
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
          await new Promise((r) => setTimeout(r, 300));
        }
        controller.close();
        delete globalThis.__zerogSim?.[runId];
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  try {
    const res = await fetch(`${ENGINE_URL}/stream/${runId}`);
    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response("Engine unavailable", { status: 503 });
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __zerogSim: Record<string, { events: string[]; idx: number }> | undefined;
}
