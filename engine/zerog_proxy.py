#!/usr/bin/env python3
"""Entry point: Antigravity MCP config should point here."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from zerog.mcp_proxy import main

if __name__ == "__main__":
    main()
