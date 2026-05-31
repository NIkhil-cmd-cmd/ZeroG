"""
Agent harness — real multi-turn tool calling via Gemini (Anthropic fallback).
No simulated runs.
"""

import os
import time
from dataclasses import dataclass, field

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
    model_turns: int
    tokens: int
    cost: float
    latency: float
    tool_calls: list[str]
    layer: str
    final_output: str
    model_logs: list[dict] = field(default_factory=list)


def _safe_gemini_response(response):
    """Parse Gemini response without NoneType on .parts."""
    if not response.candidates:
        feedback = getattr(response, "prompt_feedback", None)
        raise RuntimeError(f"Gemini returned no candidates: {feedback}")

    candidate = response.candidates[0]
    finish = getattr(candidate, "finish_reason", None)
    finish_str = str(finish or "")
    content = candidate.content

    if content is None or not getattr(content, "parts", None):
        text = getattr(response, "text", None) or ""
        if "MALFORMED_FUNCTION_CALL" in finish_str:
            return None, candidate, content, text, "malformed"
        if finish_str and finish_str not in ("STOP", "FinishReason.STOP", "1", "FinishReason.STOP"):
            raise RuntimeError(
                f"Gemini stopped without tool calls: {finish} — {text[:200]}"
            )
        return [], candidate, content, text, "stop"

    parts = content.parts or []
    function_calls = [
        p for p in parts if getattr(p, "function_call", None) and p.function_call.name
    ]
    text = getattr(response, "text", None) or ""
    return function_calls, candidate, content, text, "ok"


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

    async def run_task(
        self,
        task: str,
        cluster: str | None = None,
        agent_mode: str = "lean",
        on_tool_call=None,
        on_recall=None,
        on_turn=None,
    ) -> RunResult:
        _require_api_keys()
        start = time.time()
        lookup: LookupResult | None = None
        user_task = task
        model_logs: list[dict] = []

        use_memory = self.memory is not None and agent_mode == "pattern"

        if use_memory:
            t_lookup = time.perf_counter()
            lookup = await self.memory.lookup(task, cluster=cluster)
            lookup_ms = (time.perf_counter() - t_lookup) * 1000
            if on_recall:
                await on_recall(lookup, lookup_ms)

        explorer_system = """You are an Antigravity agent WITHOUT shared memory on Google Cloud.
Discover the deploy workflow yourself. You MUST call read_docs first for the trigger type in the task.
Then: check_permissions → write_function → set_iam(roles/cloudfunctions.invoker) → gcloud_deploy(--gen2) → DONE.
write_function must match THIS task's trigger. Never skip read_docs or check_permissions."""

        lean_system = """You are an Antigravity coding agent on Google Cloud.
Call tools one at a time: write_function → set_iam(roles/cloudfunctions.invoker) → gcloud_deploy(--gen2) → DONE.
write_function must match THIS task's trigger (Firestore/HTTP/Pub/Sub/Storage/Scheduler). Keep code under 40 lines.
Only set_iam roles/cloudfunctions.invoker before deploy. Always call the DONE tool — never reply with plain text."""

        if agent_mode == "explorer":
            system = explorer_system
            user_task = f"[No shared memory — explore from scratch]\n\n{task}"
        else:
            system = lean_system
            if use_memory and lookup and lookup.examples:
                ex = next((e for e in lookup.examples if e.success), lookup.examples[0])
                seq = " → ".join(t for t in ex.tool_sequence if t != "zerog_recall")
                prior = ex.task[:80]
                system += (
                    f"\n\n[ZeroG · sim={ex.similarity:.2f}] Teammate did: {prior}… "
                    f"Use ONLY this tool order: {seq}. "
                    f"Do NOT call read_docs, check_permissions, write_config, run_tests, or gcloud_check_status."
                )
                if on_tool_call:
                    await on_tool_call(
                        "zerog_recall",
                        f"Pattern transfer (sim={ex.similarity:.2f}) · {seq} · prior: {prior}…",
                        "complete",
                    )
            elif use_memory and lookup and lookup.hit and lookup.cached_tools:
                seq = " → ".join(lookup.cached_tools)
                system += f"\n\n[ZeroG · exact prior run] Reuse {seq}. Skip read_docs."
                if on_tool_call:
                    await on_tool_call(
                        "zerog_recall",
                        f"Exact duplicate — prior order {seq}",
                        "complete",
                    )

        state = TaskState(task=task)
        tool_calls: list[str] = []
        if use_memory and lookup and (lookup.examples or lookup.hit):
            tool_calls.append("zerog_recall")

        if GEMINI_AVAILABLE and os.environ.get("GEMINI_API_KEY"):
            output, tokens, cost, model_logs = await self._run_gemini_loop(
                system, user_task, state, tool_calls, on_tool_call, on_turn
            )
        elif ANTHROPIC_AVAILABLE and os.environ.get("ANTHROPIC_API_KEY"):
            output, tokens, cost, model_logs = await self._run_anthropic_loop(
                system, user_task, state, tool_calls, on_tool_call, on_turn
            )
        else:
            raise RuntimeError("No usable API key — set GEMINI_API_KEY or ANTHROPIC_API_KEY")

        success = task_succeeded(state)
        if state.deployed:
            output = output or "Deployment succeeded."

        if self.memory and agent_mode == "pattern":
            await self.memory.record(
                task=task,
                tools=tool_calls,
                success=success,
                final_output=output,
                embedding=lookup.embedding if lookup else None,
                cluster=cluster,
            )

        model_turns = len([t for t in tool_calls if t != "zerog_recall"])

        return RunResult(
            success=success,
            turns=len(tool_calls),
            model_turns=model_turns,
            tokens=tokens,
            cost=cost,
            latency=time.time() - start,
            tool_calls=tool_calls,
            layer=lookup.layer if lookup and use_memory else "cold_start",
            final_output=output,
            model_logs=model_logs,
        )

    async def _run_gemini_loop(self, system, task, state, tool_calls, on_tool_call, on_turn=None):
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        tools = gemini_tool_declarations()
        contents: list = [task]
        total_tokens = 0
        final_text = ""
        model_logs: list[dict] = []

        malformed_retries = 0

        for turn_idx in range(MAX_TURNS):
            response = await client.aio.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    tools=tools,
                    temperature=0.2,
                ),
            )
            turn_tokens = 0
            if response.usage_metadata:
                turn_tokens = response.usage_metadata.total_token_count or 0
                total_tokens += turn_tokens

            function_calls, candidate, content, text, status = _safe_gemini_response(response)
            turn_log: dict = {
                "turn": turn_idx + 1,
                "model": self.model,
                "tokens": turn_tokens,
                "tools": [],
                "text": text or None,
            }

            if status == "malformed" and malformed_retries < 2:
                malformed_retries += 1
                contents.append(
                    types.Content(
                        role="user",
                        parts=[
                            types.Part(
                                text=(
                                    "Your last response had a malformed function call. "
                                    "Call exactly one tool at a time with valid JSON arguments."
                                )
                            )
                        ],
                    )
                )
                turn_log["error"] = "MALFORMED_FUNCTION_CALL — retrying"
                if on_turn:
                    await on_turn(turn_log)
                model_logs.append(turn_log)
                continue

            if not function_calls:
                final_text = text or final_text
                if (
                    state.deployed
                    and (text or "").strip().upper() in ("DONE", "DONE.", "COMPLETE")
                ):
                    if "DONE" not in tool_calls:
                        tool_calls.append("DONE")
                    final_text = "Task marked complete"
                    turn_log["tools"].append(
                        {
                            "name": "DONE",
                            "args": {},
                            "result": final_text,
                            "status": "complete",
                        }
                    )
                    if on_turn:
                        await on_turn(turn_log)
                    model_logs.append(turn_log)
                    cost = total_tokens * (GEMINI_INPUT_COST + GEMINI_OUTPUT_COST) / 2
                    return final_text, total_tokens, cost, model_logs
                if on_turn:
                    await on_turn(turn_log)
                model_logs.append(turn_log)
                break

            if content is not None:
                contents.append(content)
            tool_response_parts = []

            for part in function_calls:
                fc = part.function_call
                name = fc.name
                args = dict(fc.args) if fc.args else {}
                result, status = execute_tool(name, args, state)
                if name not in tool_calls:
                    tool_calls.append(name)
                turn_log["tools"].append(
                    {
                        "name": name,
                        "args": {k: str(v)[:120] for k, v in args.items()},
                        "result": result[:240],
                        "status": status,
                    }
                )
                if on_tool_call:
                    detail = result[:160] if status != "running" else ""
                    await on_tool_call(name, detail, status)
                tool_response_parts.append(
                    types.Part.from_function_response(name=name, response={"result": result})
                )
                if name == "DONE" and status == "complete":
                    final_text = result
                    if on_turn:
                        await on_turn(turn_log)
                    model_logs.append(turn_log)
                    cost = total_tokens * (GEMINI_INPUT_COST + GEMINI_OUTPUT_COST) / 2
                    return final_text, total_tokens, cost, model_logs

            if on_turn:
                await on_turn(turn_log)
            model_logs.append(turn_log)
            contents.append(types.Content(role="user", parts=tool_response_parts))

        cost = total_tokens * (GEMINI_INPUT_COST + GEMINI_OUTPUT_COST) / 2
        return final_text or "\n".join(state.history), total_tokens, cost, model_logs

    async def _run_anthropic_loop(self, system, task, state, tool_calls, on_tool_call, on_turn=None):
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
        model_logs: list[dict] = []

        for turn_idx in range(MAX_TURNS):
            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2048,
                system=system,
                tools=tool_defs,
                messages=messages,
            )
            total_tokens += response.usage.input_tokens + response.usage.output_tokens
            turn_tokens = response.usage.input_tokens + response.usage.output_tokens
            turn_log: dict = {
                "turn": turn_idx + 1,
                "model": "claude-sonnet-4-20250514",
                "tokens": turn_tokens,
                "tools": [],
                "text": None,
            }

            tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
            text_blocks = [b.text for b in response.content if b.type == "text"]
            if text_blocks:
                final_text = text_blocks[-1]
                turn_log["text"] = final_text

            if not tool_use_blocks:
                if on_turn:
                    await on_turn(turn_log)
                model_logs.append(turn_log)
                break

            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in tool_use_blocks:
                name = block.name
                args = block.input if isinstance(block.input, dict) else {}
                result, status = execute_tool(name, args, state)
                if name not in tool_calls:
                    tool_calls.append(name)
                turn_log["tools"].append(
                    {
                        "name": name,
                        "args": {k: str(v)[:120] for k, v in args.items()},
                        "result": result[:240],
                        "status": status,
                    }
                )
                if on_tool_call:
                    await on_tool_call(name, result[:160], status)
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": result}
                )
            if on_turn:
                await on_turn(turn_log)
            model_logs.append(turn_log)
            messages.append({"role": "user", "content": tool_results})

        cost = total_tokens * 3.0 / 1_000_000
        return final_text or "\n".join(state.history), total_tokens, cost, model_logs
