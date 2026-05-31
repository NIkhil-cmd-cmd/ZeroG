export const COLORS = {
  bg: "#ffffff",
  bgSubtle: "#f8f9fa",
  text: "#202124",
  textSecondary: "#5f6368",
  accent: "#1a73e8",
  violet: "#9334e6",
  success: "#188038",
  warning: "#ea8600",
  error: "#d93025",
  surface: "#ffffff",
  border: "#dadce0",
  muted: "#80868b",
} as const;

export const GITHUB_URL = "https://github.com/NIkhil-cmd-cmd/ZeroG";
export const WEB_URL = "https://web-pi-nine-22.vercel.app";
export const PUBLIC_ENGINE_URL =
  process.env.NEXT_PUBLIC_ENGINE_URL ||
  process.env.ENGINE_URL ||
  "https://zerog-production.up.railway.app";

export const ENGINE_URL =
  process.env.ENGINE_URL || process.env.NEXT_PUBLIC_ENGINE_URL || PUBLIC_ENGINE_URL;

export const REPO_CLONE = "git clone https://github.com/NIkhil-cmd-cmd/ZeroG.git";

export const NAV_LINKS = [
  { href: "/#architecture", label: "Architecture" },
  { href: "/pitch", label: "Pitch" },
  { href: "/demo", label: "Demo" },
  { href: "/graph", label: "Graph" },
  { href: "/install", label: "Install Skill" },
] as const;

export const TOOL_COLORS: Record<string, string> = {
  read_docs: "#1a73e8",
  query_bigquery: "#1a73e8",
  run_tests: "#1a73e8",
  write_function: "#9334e6",
  write_config: "#9334e6",
  zerog_recall: "#9334e6",
  generate_code: "#9334e6",
  gcloud_deploy: "#d93025",
  gcloud_delete: "#d93025",
  set_iam: "#ea8600",
  check_permissions: "#ea8600",
  gcloud_check_status: "#ea8600",
  DONE: "#188038",
};

export function toolColor(id: string): string {
  if (TOOL_COLORS[id]) return TOOL_COLORS[id];
  if (id.includes("deploy") || id.includes("delete")) return COLORS.error;
  if (id.includes("iam") || id.includes("permission")) return COLORS.warning;
  if (id.includes("read") || id.includes("query")) return COLORS.accent;
  return COLORS.violet;
}

export type GraphNode = { id: string; count: number };
export type GraphEdge = { source: string; target: string; weight: number };
export type GraphData = { nodes: GraphNode[]; edges: GraphEdge[] };

export type EngineStats = {
  total_traces: number;
  successful: number;
  unique_tasks: number;
  gnn: {
    active: boolean;
    accuracy: number;
    loss_history: number[];
    last_trained: string | null;
    num_traces_trained: number;
  };
  demo: {
    cold_tokens_series?: number[];
    zerog_tokens_series?: number[];
    token_savings_pct?: number;
    speedup_ratio?: number;
    recall_latency_ms?: number;
    tasks_run?: number;
  };
  recent_traces?: { task: string; tools: string[]; success: boolean }[];
};
