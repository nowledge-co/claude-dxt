#!/usr/bin/env python3
import os
import sys
from uuid import uuid4
from fastmcp import FastMCP, Client
from fastmcp.client.transports import StreamableHttpTransport

LOCAL_URL = "http://localhost:14242/mcp"
CLIENT_SESSION_ID = uuid4().hex


def _resolve(env_var: str) -> str:
    """Read an env var, treating unresolved ${user_config.*} placeholders as empty."""
    val = os.environ.get(env_var, "").strip()
    if val.startswith("${"):
        return ""
    return val


remote_url = _resolve("NMEM_API_URL").rstrip("/")
api_key = _resolve("NMEM_API_KEY")

if remote_url:
    base_url = f"{remote_url}/mcp"
    headers = {
        "APP": "Claude",
        "X-Nmem-Client": "claude-dxt",
        "X-Nmem-Client-Session": CLIENT_SESSION_ID,
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    print(f"[Nowledge Mem] Connecting to remote: {remote_url}", file=sys.stderr)
else:
    base_url = LOCAL_URL
    headers = {
        "APP": "Claude",
        "X-Nmem-Client": "claude-dxt",
        "X-Nmem-Client-Session": CLIENT_SESSION_ID,
    }
    print("[Nowledge Mem] Connecting to local Mem", file=sys.stderr)

client = Client(
    transport=StreamableHttpTransport(base_url, headers=headers)
)

# Bridge remote/local MCP server to stdio for Claude Desktop
remote_proxy = FastMCP.as_proxy(client, name="Nowledge Mem")


def _is_client_disconnect(exc: BaseException) -> bool:
    """Check if an exception (or exception group) is just the client closing the pipe."""
    from anyio import ClosedResourceError, BrokenResourceError

    if isinstance(exc, (ClosedResourceError, BrokenResourceError)):
        return True
    if isinstance(exc, BaseExceptionGroup):
        return all(_is_client_disconnect(e) for e in exc.exceptions)
    return False


if __name__ == "__main__":
    try:
        remote_proxy.run()  # Defaults to stdio
    except BaseException as e:
        if _is_client_disconnect(e):
            # Normal shutdown — client closed the connection (e.g. settings reload)
            pass
        else:
            print(f"[Nowledge Mem] Exception: {e}", file=sys.stderr)
            raise
