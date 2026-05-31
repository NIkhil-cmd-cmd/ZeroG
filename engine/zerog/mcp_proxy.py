"""
ZeroG MCP proxy — sits between Antigravity and real MCP servers.

Antigravity → ZeroG proxy (stdio) → upstream MCP server (stdio)
              ↳ memory lookup / record on each tools/call
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import anyio
import mcp.types as types
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.server import Server
from mcp.server.stdio import stdio_server

# Allow running from engine/ with zerog package on path
_ENGINE = Path(__file__).parent.parent
if str(_ENGINE) not in sys.path:
    sys.path.insert(0, str(_ENGINE))

from zerog.memory import ZeroGMemory  # noqa: E402
from zerog.session_log import serialize_lookup  # noqa: E402

memory = ZeroGMemory()


def upstream_params() -> StdioServerParameters:
    """Configure upstream MCP via REAL_MCP_COMMAND + REAL_MCP_ARGS (comma-separated)."""
    command = os.environ.get("REAL_MCP_COMMAND", "python3")
    args_raw = os.environ.get("REAL_MCP_ARGS", "-c,print('Configure REAL_MCP_COMMAND and REAL_MCP_ARGS')")
    args = [a.strip() for a in args_raw.split(",") if a.strip()]
    env = {k: v for k, v in os.environ.items() if k not in ("PYTHONPATH",)}
    return StdioServerParameters(command=command, args=args, env=env)


def tool_task_key(name: str, arguments: dict) -> str:
    return f"{name}:{json.dumps(arguments, sort_keys=True, default=str)}"


def content_to_text(content) -> str:
    parts: list[str] = []
    for block in content or []:
        if isinstance(block, types.TextContent):
            parts.append(block.text)
        elif hasattr(block, "text"):
            parts.append(block.text)
        else:
            parts.append(str(block))
    return "\n".join(parts)


def zerog_footer(layer: str, cached: bool, examples: list | None = None) -> str:
    msg = f"[ZeroG · layer={layer}"
    if cached:
        msg += " · cache hit · upstream skipped"
    elif examples:
        ex = examples[0]
        sim = ex.get("similarity", 0)
        msg += f" · few-shot sim={sim:.2f} · forwarded"
    else:
        msg += " · cold · forwarded"
    return msg + "]"


async def run_proxy() -> None:
    cluster = os.environ.get("ZEROG_CLUSTER", "cloud_functions")
    params = upstream_params()

    async with stdio_client(params) as (up_read, up_write):
        async with ClientSession(up_read, up_write) as upstream:
            await upstream.initialize()

            server = Server("zerog-proxy")

            @server.list_tools()
            async def list_tools() -> list[types.Tool]:
                result = await upstream.list_tools()
                return result.tools

            @server.call_tool(validate_input=False)
            async def call_tool(name: str, arguments: dict):
                key = tool_task_key(name, arguments)
                lookup = await memory.lookup(key, cluster=cluster)
                meta = serialize_lookup(lookup)

                if lookup.hit:
                    text = lookup.cached_result or content_to_text(
                        [types.TextContent(type="text", text="OK")]
                    )
                    return [
                        types.TextContent(type="text", text=text),
                        types.TextContent(
                            type="text",
                            text=zerog_footer(lookup.layer, cached=True),
                        ),
                        types.TextContent(
                            type="text",
                            text=json.dumps({"zerog": meta}, indent=2),
                        ),
                    ]

                # few_shot / cold — always forward; memory records pattern not artifact reuse
                result = await upstream.call_tool(name, arguments)
                output_text = content_to_text(result.content)
                is_error = bool(getattr(result, "isError", False))

                if not is_error:
                    prior_tools = (
                        lookup.examples[0].tool_sequence
                        if lookup.examples
                        else []
                    )
                    tools = list(prior_tools) if prior_tools else []
                    if name not in tools:
                        tools.append(name)
                    await memory.record(
                        task=key,
                        tools=tools,
                        success=True,
                        final_output=output_text,
                        embedding=lookup.embedding,
                        cluster=cluster,
                    )

                footer = zerog_footer(
                    lookup.layer,
                    cached=False,
                    examples=meta.get("examples"),
                )
                blocks = list(result.content or [])
                blocks.append(types.TextContent(type="text", text=footer))
                blocks.append(
                    types.TextContent(
                        type="text",
                        text=json.dumps({"zerog": meta}, indent=2),
                    )
                )
                return blocks

            async with stdio_server() as (read, write):
                await server.run(read, write, server.create_initialization_options())


def main() -> None:
    anyio.run(run_proxy)


if __name__ == "__main__":
    main()
