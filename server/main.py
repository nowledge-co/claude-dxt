#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
from uuid import uuid4
from fastmcp import Client
from fastmcp.client.transports import StreamableHttpTransport
from fastmcp.server import create_proxy

LOCAL_URL = "http://127.0.0.1:14242/mcp"
CLIENT_SESSION_ID = uuid4().hex
CONFIG_PATH = Path.home() / ".nowledge-mem" / "config.json"


def _resolve(env_var: str) -> str:
    """Read an env var, treating unresolved ${user_config.*} placeholders as empty."""
    val = os.environ.get(env_var, "").strip()
    if val.startswith("${"):
        return ""
    return val


def _load_config() -> dict[str, object]:
    try:
        if CONFIG_PATH.is_file():
            raw = CONFIG_PATH.read_text(encoding="utf-8")
            data = json.loads(raw)
            if isinstance(data, dict):
                return data
    except Exception as exc:
        print(
            f"[Nowledge Mem] Warning: could not read {CONFIG_PATH}: {exc}",
            file=sys.stderr,
        )
    return {}


def _read_config_value(config: dict[str, object], *keys: str) -> str:
    for key in keys:
        value = config.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _strip_legacy_remote_api_prefix(url: str) -> str:
    parts = urlsplit(url)
    path = parts.path or ""

    if path == "/remote-api":
        path = "/"
    elif path.startswith("/remote-api/"):
        path = path[len("/remote-api") :]
    else:
        return url

    return urlunsplit((parts.scheme, parts.netloc, path, parts.query, parts.fragment))


def _resolve_api_url(config: dict[str, object]) -> str:
    env = _resolve("NMEM_API_URL")
    if env:
        return _strip_legacy_remote_api_prefix(env.rstrip("/")).rstrip("/")
    configured = _read_config_value(config, "apiUrl", "api_url")
    if configured:
        return _strip_legacy_remote_api_prefix(configured.rstrip("/")).rstrip("/")
    return ""


def _resolve_api_key(config: dict[str, object]) -> str:
    env = _resolve("NMEM_API_KEY")
    if env:
        return env
    return _read_config_value(config, "apiKey", "api_key")


config = _load_config()
remote_url = _resolve_api_url(config)
api_key = _resolve_api_key(config)

if remote_url:
    base_url = f"{remote_url}/mcp"
    headers = {
        "APP": "Claude",
        "X-Nmem-Client": "claude-dxt",
        "X-Nmem-Client-Session": CLIENT_SESSION_ID,
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
        headers["X-NMEM-API-Key"] = api_key
    print(f"[Nowledge Mem] Connecting to remote: {remote_url}", file=sys.stderr)
else:
    base_url = LOCAL_URL
    headers = {
        "APP": "Claude",
        "X-Nmem-Client": "claude-dxt",
        "X-Nmem-Client-Session": CLIENT_SESSION_ID,
    }
    if CONFIG_PATH.is_file():
        print(
            "[Nowledge Mem] No remote URL configured in shared Mem config, using local Mem",
            file=sys.stderr,
        )
    else:
        print("[Nowledge Mem] Connecting to local Mem", file=sys.stderr)

client = Client(
    transport=StreamableHttpTransport(base_url, headers=headers)
)

# Bridge remote/local MCP server to stdio for Claude Desktop
remote_proxy = create_proxy(client, name="Nowledge Mem")


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
