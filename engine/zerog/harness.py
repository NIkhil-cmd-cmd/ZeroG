"""
Agent harness using google-genai SDK (Gemini 3.5 Flash).
Two modes: cold (no memory) and zerog (with shared memory).
Falls back to Anthropic if Gemini unavailable.
"""

import os
import time
from dataclasses import dataclass
from zerog.memory import ZeroGMemory, LookupResult

try:
    from google import genai

    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

try:
    import anthropic

    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


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


class ZeroGHarness:
    def __init__(self, memory: ZeroGMemory | None = None, model: str = "gemini-2.0-flash"):
        self.memory = memory
        self.model = model

    async def run_task(self, task: str, on_tool_call=None) -> RunResult:
        start = time.time()
        lookup: LookupResult | None = None
        system_additions = ""

        if self.memory:
            lookup = await self.memory.lookup(task)
            if lookup.hit:
                if on_tool_call:
                    await on_tool_call(
                        "zerog_recall", "Cache hit — returning stored trace", "complete"
                    )
                return RunResult(
                    success=True,
                    turns=0,
                    tokens=0,
                    cost=0.0,
                    latency=time.time() - start,
                    tool_calls=["zerog_recall"],
                    layer=lookup.layer,
                    final_output=lookup.cached_result or "",
                )

            if lookup.examples:
                examples_text = "\n".join(
                    f"- Similar task: {ex.task}\n  Solution: {' → '.join(ex.tool_sequence)} ({'✓' if ex.success else '✗'})"
                    for ex in lookup.examples[:1]
                )
                system_additions = f"\n\nZeroG shared memory found similar past sessions:\n{examples_text}\nUse these patterns to solve the task more efficiently."
                if on_tool_call:
                    await on_tool_call(
                        "zerog_recall",
                        f"Found {len(lookup.examples)} similar traces",
                        "complete",
                    )

        system = f"""You are an Antigravity coding agent working on Google Cloud infrastructure.
Complete the task by writing the necessary code and commands.
Be concise and correct.{system_additions}"""

        tool_calls, tokens_used, output = [], 0, ""

        if GEMINI_AVAILABLE and "gemini" in self.model:
            output, tokens_used = await self._run_gemini(
                system, task, on_tool_call, tool_calls
            )
        elif ANTHROPIC_AVAILABLE:
            output, tokens_used = await self._run_anthropic(
                system, task, on_tool_call, tool_calls
            )
        else:
            output, tokens_used = await self._run_simulated(
                system, task, on_tool_call, tool_calls
            )

        success = len(output) > 50
        cost = tokens_used * 0.000001
        all_tools = (
            (["zerog_recall"] if lookup and lookup.examples else []) + tool_calls + ["generate_code"]
        )

        if self.memory:
            await self.memory.record(
                task=task,
                tools=all_tools,
                success=success,
                embedding=lookup.embedding if lookup else None,
            )

        return RunResult(
            success=success,
            turns=len(tool_calls) + 1,
            tokens=tokens_used,
            cost=cost,
            latency=time.time() - start,
            tool_calls=all_tools,
            layer=lookup.layer if lookup else "none",
            final_output=output,
        )

    async def _run_simulated(self, system, task, on_tool_call, tool_calls):
        """Fallback when no API keys — simulates realistic tool sequences for demo."""
        simulated_tools = [
            ("read_docs", "Reading Cloud Functions docs...", "running"),
            ("read_docs", "Done", "complete"),
            ("write_function", "Writing function code...", "running"),
            ("write_function", "Done", "complete"),
            ("gcloud_deploy", "Deploying with --gen2...", "running"),
            ("gcloud_deploy", "ERROR: missing roles/cloudfunctions.invoker", "error"),
            ("set_iam", "Setting IAM binding...", "running"),
            ("set_iam", "Done", "complete"),
            ("gcloud_deploy", "Deploy successful", "complete"),
        ]
        if "ZeroG shared memory" in system:
            simulated_tools = [
                ("zerog_recall", "Found 2 similar traces", "complete"),
                ("write_function", "Writing function (--gen2, IAM pre-configured)...", "running"),
                ("write_function", "Done", "complete"),
                ("gcloud_deploy", "Deploy successful", "complete"),
            ]
        output_parts = []
        for tool, detail, status in simulated_tools:
            if on_tool_call:
                await on_tool_call(tool, detail, status)
            if tool not in tool_calls and tool != "zerog_recall":
                tool_calls.append(tool)
            output_parts.append(f"{tool}: {detail}")
        tokens = 4200 if "ZeroG" not in system else 1180
        return "\n".join(output_parts), tokens

    async def _run_gemini(self, system, task, on_tool_call, tool_calls):
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        if on_tool_call:
            await on_tool_call("generate_code", "Generating solution...", "running")
        response = await client.aio.models.generate_content(
            model=self.model,
            contents=task,
            config=genai.types.GenerateContentConfig(
                system_instruction=system, temperature=0.2
            ),
        )
        output = response.text or ""
        tokens = (
            response.usage_metadata.total_token_count
            if response.usage_metadata
            else 500
        )
        tool_calls.append("generate_code")
        if on_tool_call:
            await on_tool_call("generate_code", "Done", "complete")
        return output, tokens

    async def _run_anthropic(self, system, task, on_tool_call, tool_calls):
        client = anthropic.AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        if on_tool_call:
            await on_tool_call("generate_code", "Generating solution...", "running")
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            system=system,
            messages=[{"role": "user", "content": task}],
        )
        output = response.content[0].text if response.content else ""
        tokens = response.usage.input_tokens + response.usage.output_tokens
        tool_calls.append("generate_code")
        if on_tool_call:
            await on_tool_call("generate_code", "Done", "complete")
        return output, tokens
