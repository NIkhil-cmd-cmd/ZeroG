"""
Agent harness — real multi-turn tool calling via Gemini (Anthropic fallback).
No simulated runs.
"""

import os
import time
from dataclasses import dataclass

from zerog.config import DEFAULT_GEMINI_MODEL
from zerog.memory import ZeroGMemory, LookupResult
from zerog.tools import TaskState, execute_tool, gemini_tool_declarations, task_succeeded

try:
    from google import genai
    from google.genai import types

    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    import anthropic

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

MAX_TURNS = 20
GEMINI_INPUT_COST = 0.10 / 1_000_000
GEMINI_OUTPUT_COST = 0.40 / 1_000_000


@dataclass
class RunResult:
    success: bool
    turns: int
    tokens: int
    cost: float
    latency: float
    tool_calls: list[str]
    layer: str
    final_output: str


def _require_api_keys():
    if os.environ.get("GEMINI_API_KEY"):
        return
    if os.environ.get("ANTHROPIC_API_KEY"):
        return
    raise RuntimeError(
        "Set GEMINI_API_KEY (or ANTHROPIC_API_KEY) in .env — simulated runs are disabled"
    )


class ZeroGHarness:
    def __init__(self, memory: ZeroGMemory | None = None, model: str | None = None):
        self.memory = memory
        self.model = model or DEFAULT_GEMINI_MODEL

    async def run_task(self, task: str, cluster: str | None = None, on_tool_call=None) -> RunResult:
        _require_api_keys()
        start = time.time()
        lookup: LookupResult | None = None
        system_additions = ""

        if self.memory:
            lookup = await self.memory.lookup(task, cluster=cluster)
            if lookup.hit:
                if on_tool_call:
                    await on_tool_call(
                        "zerog_recall",
                        lookup.cached_result or "Cache hit",
                        "complete",
                    )
                return RunResult(
                    success=True,
                    turns=1,
                    tokens=0,
                    cost=0.0,
                    latency=time.time() - start,
                    tool_calls=["zerog_recall"],
                    layer=lookup.layer,
                    final_output=lookup.cached_result or "",
                )

            if lookup.examples:
                ex = lookup.examples[0]
                examples_text = (
                    f"- Similar task: {ex.task}\n"
                    f"  Solution: {' → '.join(ex.tool_sequence)} ({'✓' if ex.success else '✗'})"
                )
                system_additions = (
                    f"\n\nZeroG shared memory found similar past sessions:\n{examples_text}\n"
                    "Use these patterns — skip redundant doc reads and failed deploy paths."
                )
                if on_tool_call:
                    await on_tool_call(
                        "zerog_recall",
                        f"Found {len(lookup.examples)} similar traces (sim={ex.similarity:.2f})",
                        "complete",
                    )

        system = f"""You are an Antigravity coding agent on Google Cloud.
Solve the task by calling tools in sequence. Use --gen2 when deploying Cloud Functions.
Set IAM before deploy if needed. Call DONE when finished.{system_additions}"""

        state = TaskState(task=task)
        tool_calls: list[str] = []
        if lookup and lookup.examples:
            tool_calls.append("zerog_recall")

        if GEMINI_AVAILABLE and os.environ.get("GEMINI_API_KEY"):
            output, tokens, cost = await self._run_gemini_loop(
                system, task, state, tool_calls, on_tool_call
            )
        elif ANTHROPIC_AVAILABLE and os.environ.get("ANTHROPIC_API_KEY"):
            output, tokens, cost = await self._run_anthropic_loop(
                system, task, state, tool_calls, on_tool_call
            )
        else:
            raise RuntimeError("No usable API key — set GEMINI_API_KEY or ANTHROPIC_API_KEY")

        success = task_succeeded(state)
        if state.deployed:
            output = output or "Deployment succeeded."

        if self.memory:
            await self.memory.record(
                task=task,
                tools=tool_calls,
                success=success,
                final_output=output,
                embedding=lookup.embedding if lookup else None,
                cluster=cluster,
            )

        return RunResult(
            success=success,
            turns=len(tool_calls),
            tokens=tokens,
            cost=cost,
            latency=time.time() - start,
            tool_calls=tool_calls,
            layer=lookup.layer if lookup else "cold_start",
            final_output=output,
        )

    async def _run_gemini_loop(self, system, task, state, tool_calls, on_tool_call):
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        tools = gemini_tool_declarations()
        contents: list = [task]
        total_tokens = 0
        final_text = ""

        for _ in range(MAX_TURNS):
            response = await client.aio.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    tools=tools,
                    temperature=0.2,
                ),
            )
            if response.usage_metadata:
                total_tokens += response.usage_metadata.total_token_count or 0

            parts = response.candidates[0].content.parts if response.candidates else []
            function_calls = [p for p in parts if p.function_call]

            if not function_calls:
                final_text = response.text or final_text
                break

            contents.append(response.candidates[0].content)
            tool_response_parts = []

            for part in function_calls:
                fc = part.function_call
                name = fc.name
                args = dict(fc.args) if fc.args else {}
                result, status = execute_tool(name, args, state)
                if name not in tool_calls:
                    tool_calls.append(name)
                if on_tool_call:
                    detail = result[:160] if status != "running" else ""
                    await on_tool_call(name, detail, status)
                tool_response_parts.append(
                    types.Part.from_function_response(name=name, response={"result": result})
                )
                if name == "DONE" and status == "complete":
                    final_text = result
                    cost = total_tokens * (GEMINI_INPUT_COST + GEMINI_OUTPUT_COST) / 2
                    return final_text, total_tokens, cost

            contents.append(types.Content(role="user", parts=tool_response_parts))

        cost = total_tokens * (GEMINI_INPUT_COST + GEMINI_OUTPUT_COST) / 2
        return final_text or "\n".join(state.history), total_tokens, cost

    async def _run_anthropic_loop(self, system, task, state, tool_calls, on_tool_call):
        """Anthropic tool-use fallback with same tool surface."""
        client = anthropic.AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        tool_defs = [
            {"name": "read_docs", "description": "Read GCP docs", "input_schema": {"type": "object", "properties": {"topic": {"type": "string"}}, "required": ["topic"]}},
            {"name": "write_function", "description": "Write function code", "input_schema": {"type": "object", "properties": {"code": {"type": "string"}, "use_gen2": {"type": "boolean"}}, "required": ["code"]}},
            {"name": "gcloud_deploy", "description": "Deploy function", "input_schema": {"type": "object", "properties": {"flags": {"type": "string"}}, "required": ["flags"]}},
            {"name": "set_iam", "description": "Set IAM", "input_schema": {"type": "object", "properties": {"role": {"type": "string"}}, "required": ["role"]}},
            {"name": "check_permissions", "description": "Check IAM", "input_schema": {"type": "object", "properties": {}}},
            {"name": "DONE", "description": "Finish task", "input_schema": {"type": "object", "properties": {}}},
        ]
        messages = [{"role": "user", "content": task}]
        total_tokens = 0
        final_text = ""

        for _ in range(MAX_TURNS):
            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                system=system,
                tools=tool_defs,
                messages=messages,
            )
            total_tokens += response.usage.input_tokens + response.usage.output_tokens

            tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
            text_blocks = [b.text for b in response.content if b.type == "text"]
            if text_blocks:
                final_text = text_blocks[-1]

            if not tool_use_blocks:
                break

            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in tool_use_blocks:
                name = block.name
                args = block.input if isinstance(block.input, dict) else {}
                result, status = execute_tool(name, args, state)
                if name not in tool_calls:
                    tool_calls.append(name)
                if on_tool_call:
                    await on_tool_call(name, result[:160], status)
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": result}
                )
            messages.append({"role": "user", "content": tool_results})

        cost = total_tokens * 3.0 / 1_000_000
        return final_text or "\n".join(state.history), total_tokens, cost
