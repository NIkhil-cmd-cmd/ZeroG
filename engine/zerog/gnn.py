"""
Graph Neural Network for tool-use prediction.
Trained on REAL traces from Antigravity sessions.
Architecture: 2-layer GraphSAGE + task-conditioned classifier.
"""

import torch
import torch.nn as nn
import numpy as np
from collections import Counter


class ToolGNN(nn.Module):
    def __init__(self, num_tools: int, hidden_dim: int = 64, task_dim: int = 1536):
        super().__init__()
        self.num_tools = num_tools
        self.node_emb = nn.Embedding(num_tools, hidden_dim)
        self.task_proj = nn.Linear(task_dim, hidden_dim)
        self.W1_self = nn.Linear(hidden_dim, hidden_dim)
        self.W1_neigh = nn.Linear(hidden_dim, hidden_dim)
        self.W2_self = nn.Linear(hidden_dim, hidden_dim)
        self.W2_neigh = nn.Linear(hidden_dim, hidden_dim)
        self.classifier = nn.Linear(hidden_dim * 2, num_tools)

    def message_pass(self, x, edge_index, edge_weight, W_self, W_neigh):
        num_nodes = x.size(0)
        agg = torch.zeros(num_nodes, x.size(1))
        counts = torch.zeros(num_nodes, 1) + 1e-8
        for i in range(edge_index.size(1)):
            src, dst = edge_index[0, i], edge_index[1, i]
            w = edge_weight[i]
            agg[dst] += w * x[src]
            counts[dst] += w
        return torch.relu(W_self(x) + W_neigh(agg / counts))

    def forward(self, edge_index, edge_weight):
        x = self.node_emb.weight
        x = self.message_pass(x, edge_index, edge_weight, self.W1_self, self.W1_neigh)
        x = self.message_pass(x, edge_index, edge_weight, self.W2_self, self.W2_neigh)
        return x

    def predict(
        self,
        current_tool_idx: int,
        task_embedding: np.ndarray,
        edge_index,
        edge_weight,
        visited: set[int] | None = None,
    ) -> dict:
        self.eval()
        with torch.no_grad():
            node_embs = self.forward(edge_index, edge_weight)
            tool_vec = node_embs[current_tool_idx]
            task_vec = self.task_proj(torch.tensor(task_embedding, dtype=torch.float32))
            logits = self.classifier(torch.cat([tool_vec, task_vec]))
            if visited:
                for v in visited:
                    logits[v] = float("-inf")
            probs = torch.softmax(logits, dim=0)
            top3 = torch.topk(probs, min(3, self.num_tools))
            return {
                "predictions": [
                    {"tool_idx": int(idx), "confidence": float(conf)}
                    for idx, conf in zip(top3.indices, top3.values)
                ],
                "top_confidence": float(top3.values[0]),
            }


def train_gnn(traces: list[dict], tool_vocab: list[str], epochs: int = 200) -> ToolGNN | None:
    tool_to_idx = {t: i for i, t in enumerate(tool_vocab)}
    num_tools = len(tool_vocab)
    edge_counts = Counter()
    for trace in traces:
        tools = trace["tools"]
        for i in range(len(tools) - 1):
            if tools[i] in tool_to_idx and tools[i + 1] in tool_to_idx:
                edge_counts[(tool_to_idx[tools[i]], tool_to_idx[tools[i + 1]])] += 1
    if not edge_counts:
        return None
    edges = list(edge_counts.keys())
    weights = [edge_counts[e] for e in edges]
    from_totals = {}
    for (src, _), w in zip(edges, weights):
        from_totals[src] = from_totals.get(src, 0) + w
    norm_weights = [w / from_totals[src] for (src, _), w in zip(edges, weights)]
    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    edge_weight = torch.tensor(norm_weights, dtype=torch.float32)
    pairs = []
    for trace in traces:
        tools = trace["tools"]
        for i in range(len(tools) - 1):
            if tools[i] in tool_to_idx and tools[i + 1] in tool_to_idx:
                pairs.append((tool_to_idx[tools[i]], tool_to_idx[tools[i + 1]]))
    model = ToolGNN(num_tools)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    loss_fn = nn.CrossEntropyLoss()
    model.train()
    for _ in range(epochs):
        optimizer.zero_grad()
        node_embs = model.forward(edge_index, edge_weight)
        total_loss = torch.tensor(0.0)
        for current, next_tool in pairs:
            logits = model.classifier(torch.cat([node_embs[current], torch.zeros(64)]))
            total_loss += loss_fn(logits.unsqueeze(0), torch.tensor([next_tool]))
        total_loss.backward()
        optimizer.step()
    return model
