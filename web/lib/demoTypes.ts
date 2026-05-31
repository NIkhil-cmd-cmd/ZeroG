export type DemoLogEntry = Record<string, unknown> & { ts?: number; type: string };

export type RecallEvent = {
  layer: string;
  hit?: boolean;
  task?: string;
  cluster?: string;
  gnn_active?: boolean;
  examples: { task: string; tools: string[]; success: boolean; similarity: number }[];
  gnn_steps: {
    current_tool: string;
    note?: string;
    predictions: { tool: string; confidence: number }[];
  }[];
};

export type DemoExport = {
  run_id: string;
  started_at: number;
  exported_at: number;
  entry_count: number;
  demo_stats: Record<string, unknown>;
  entries: DemoLogEntry[];
};
