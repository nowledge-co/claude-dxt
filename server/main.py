import sys
from fastmcp import FastMCP
from fastmcp.server.proxy import ProxyClient

config = {
    "mcpServers": {
        "default": {  # For single server configs, 'default' is commonly used
            "url": "http://localhost:14242/mcp",
            "transport": "http"
        }
    }
}
# Bridge remote SSE server to local stdio
remote_proxy = FastMCP.as_proxy(
    config,
    name="Nowledge Mem"
)

# Run locally via stdio for Claude Desktop
if __name__ == "__main__":
    try:
        remote_proxy.run()  # Defaults to stdio
    except Exception as e:
        print(f"[Nowledge Mem] Exception: {e}", file=sys.stderr)
        raise
