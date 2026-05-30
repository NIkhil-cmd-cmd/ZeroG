import { NextRequest, NextResponse } from "next/server";
import { ENGINE_URL } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const res = await fetch(`${ENGINE_URL}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json(await simulateRun(body));
  }
}

async function simulateRun(body: { count?: number }) {
  const run_id = `sim-${Date.now()}`;
  const count = body.count || 5;
  const tasks = [
    "Deploy Cloud Function with Firestore trigger",
    "Deploy Cloud Function with Pub/Sub trigger",
    "Create BigQuery scheduled query",
    "Configure Workload Identity Federation",
    "Set up Secret Manager rotation",
  ].slice(0, count);

  globalThis.__zerogSim = globalThis.__zerogSim || {};
  const sim = globalThis.__zerogSim as Record<
    string,
    { events: string[]; idx: number }
  >;
  sim[run_id] = { events: [], idx: 0 };

  for (let i = 0; i < tasks.length; i++) {
    sim[run_id].events.push(
      JSON.stringify({ type: "task_start", index: i, task: tasks[i] })
    );
    const coldTools = [
      ["read_docs", "Reading docs", "complete"],
      ["write_function", "Writing function", "complete"],
      ["gcloud_deploy", "Deploy failed", "error"],
      ["set_iam", "Setting IAM", "complete"],
      ["gcloud_deploy", "Deploy OK", "complete"],
    ];
    for (const [tool, detail, status] of coldTools) {
      sim[run_id].events.push(
        JSON.stringify({
          type: "tool_call",
          agent: "cold",
          index: i,
          tool,
          detail,
          status,
        })
      );
    }
    sim[run_id].events.push(
      JSON.stringify({
        type: "task_complete",
        agent: "cold",
        index: i,
        success: true,
        turns: 6,
        tokens: 4200,
        cost: 0.14,
        latency: 47,
        tool_calls: coldTools.map((t) => t[0]),
        layer: "cold_start",
      })
    );

    sim[run_id].events.push(
      JSON.stringify({
        type: "tool_call",
        agent: "zerog",
        index: i,
        tool: "zerog_recall",
        detail: `Found ${Math.min(i + 1, 3)} similar traces`,
        status: "complete",
      })
    );
    const zTools = [
      ["write_function", "Writing (--gen2 preset)", "complete"],
      ["gcloud_deploy", "Deploy OK", "complete"],
    ];
    for (const [tool, detail, status] of zTools) {
      sim[run_id].events.push(
        JSON.stringify({
          type: "tool_call",
          agent: "zerog",
          index: i,
          tool,
          detail,
          status,
        })
      );
    }
    const tokens = i === 0 ? 2100 : Math.max(800, 2100 - i * 300);
    sim[run_id].events.push(
      JSON.stringify({
        type: "task_complete",
        agent: "zerog",
        index: i,
        success: true,
        turns: 2 + (i === 0 ? 1 : 0),
        tokens,
        cost: tokens * 0.000001,
        latency: 11 + i * 2,
        tool_calls: ["zerog_recall", ...zTools.map((t) => t[0])],
        layer: i === 0 ? "few_shot" : i > 2 ? "semantic_match" : "few_shot",
      })
    );
  }
  sim[run_id].events.push(
    JSON.stringify({ type: "run_complete", total_tasks: tasks.length })
  );

  return { run_id };
}

declare global {
  // eslint-disable-next-line no-var
  var __zerogSim: Record<string, { events: string[]; idx: number }> | undefined;
}
