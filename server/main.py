#!/usr/bin/env python3
import sys
from fastmcp import FastMCP
from fastmcp.server.proxy import ProxyClient

from fastmcp import Client
from fastmcp.client.transports import StreamableHttpTransport

client = Client(
    transport=StreamableHttpTransport(
        "http://localhost:14242/mcp", 
        headers={"APP": "Claude"},
    )
)

# Bridge remote SSE server to local stdio
remote_proxy = FastMCP.as_proxy(
    client,
    name="Nowledge Mem"
)

# Run locally via stdio for Claude Desktop
if __name__ == "__main__":
    try:
        remote_proxy.run()  # Defaults to stdio
    except Exception as e:
        print(f"[Nowledge Mem] Exception: {e}", file=sys.stderr)
        raise
