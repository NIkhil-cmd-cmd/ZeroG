export const COLORS = {
  bg: "#0a0a0a",
  text: "#e8e8e8",
  accent: "#4285f4",
  violet: "#7c3aed",
  success: "#34a853",
  warning: "#fbbc04",
  error: "#ea4335",
  surface: "#141414",
  border: "#1e1e1e",
  muted: "#555555",
} as const;

export const GITHUB_URL = "https://github.com/NIkhil-cmd-cmd/ZeroG";

export const ENGINE_URL =
  process.env.ENGINE_URL || process.env.NEXT_PUBLIC_ENGINE_URL || "http://localhost:8000";

export const DEFAULT_NODES = [
  { id: "read_docs", color: "#4285f4", size: 30 },
  { id: "write_function", color: "#7c3aed", size: 25 },
  { id: "gcloud_deploy", color: "#ea4335", size: 22 },
  { id: "set_iam", color: "#fbbc04", size: 18 },
  { id: "run_tests", color: "#4285f4", size: 20 },
  { id: "check_permissions", color: "#fbbc04", size: 15 },
  { id: "query_bigquery", color: "#4285f4", size: 14 },
  { id: "write_config", color: "#7c3aed", size: 12 },
  { id: "zerog_recall", color: "#7c3aed", size: 28 },
  { id: "generate_code", color: "#7c3aed", size: 26 },
  { id: "DONE", color: "#34a853", size: 25 },
];

export const DEFAULT_EDGES = [
  { source: "zerog_recall", target: "generate_code", weight: 280 },
  { source: "read_docs", target: "write_function", weight: 340 },
  { source: "generate_code", target: "write_function", weight: 310 },
  { source: "write_function", target: "gcloud_deploy", weight: 290 },
  { source: "gcloud_deploy", target: "set_iam", weight: 180 },
  { source: "set_iam", target: "gcloud_deploy", weight: 170 },
  { source: "gcloud_deploy", target: "DONE", weight: 250 },
  { source: "write_function", target: "run_tests", weight: 200 },
  { source: "run_tests", target: "write_function", weight: 90 },
  { source: "run_tests", target: "gcloud_deploy", weight: 150 },
  { source: "read_docs", target: "check_permissions", weight: 120 },
  { source: "check_permissions", target: "set_iam", weight: 110 },
  { source: "query_bigquery", target: "write_function", weight: 60 },
  { source: "write_config", target: "gcloud_deploy", weight: 80 },
];

export const TERMINAL_LINES = {
  monday: [
    { text: '$ antigravity run "Deploy Cloud Function with Firestore trigger"', type: "cmd" },
    { text: "→ read_docs googleapis.com/cloudfunctions      2.1s", type: "tool" },
    { text: "→ write_function index.js                       1.4s", type: "tool" },
    { text: "→ gcloud functions deploy --gen1                 ✗", type: "error" },
    { text: "  ERROR: --gen2 required for Cloud Run backing", type: "error" },
    { text: "→ read_docs gen2 migration guide                 1.8s", type: "tool" },
    { text: "→ write_function index.js (patched)              1.1s", type: "tool" },
    { text: "→ gcloud functions deploy --gen2                 ✗", type: "error" },
    { text: "  ERROR: missing roles/cloudfunctions.invoker", type: "error" },
    { text: "→ gcloud iam set-binding                         0.9s", type: "tool" },
    { text: "→ gcloud functions deploy --gen2                 ✓", type: "success" },
    { text: "", type: "meta" },
    { text: "8 tool calls · 4,200 tokens · $0.14 · 47s", type: "meta" },
  ],
  tuesday: [
    { text: '$ antigravity run "Deploy Cloud Function with Pub/Sub trigger"', type: "cmd" },
    { text: "→ read_docs googleapis.com/cloudfunctions      2.1s", type: "tool" },
    { text: "→ write_function index.js                       1.4s", type: "tool" },
    { text: "→ gcloud functions deploy --gen1                 ✗", type: "error" },
    { text: "  ERROR: --gen2 required for Cloud Run backing", type: "error" },
    { text: "→ read_docs gen2 migration guide                 1.8s", type: "tool" },
    { text: "→ write_function index.js (patched)              1.1s", type: "tool" },
    { text: "→ gcloud functions deploy --gen2                 ✗", type: "error" },
    { text: "  ERROR: missing roles/cloudfunctions.invoker", type: "error" },
    { text: "→ gcloud iam set-binding                         0.9s", type: "tool" },
    { text: "→ gcloud functions deploy --gen2                 ✓", type: "success" },
    { text: "", type: "meta" },
    { text: "8 tool calls · 4,200 tokens · $0.14 · 47s", type: "meta" },
  ],
};
