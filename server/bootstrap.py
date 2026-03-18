#!/usr/bin/env python3
from __future__ import annotations

import os
import platform
import runpy
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
VENDOR_ROOT = ROOT / "lib"
MAIN_PATH = ROOT / "main.py"


def _normalize_machine(value: str) -> str:
    machine = value.strip().lower()
    aliases = {
        "amd64": "amd64",
        "x86_64": "amd64",
        "x64": "amd64",
        "arm64": "arm64",
        "aarch64": "arm64",
    }
    return aliases.get(machine, machine)


def _detect_vendor_subdir() -> str:
    override = os.environ.get("NOWLEDGE_MEM_DXT_VENDOR_DIR", "").strip()
    if override:
        return override

    target = (sys.platform, _normalize_machine(platform.machine()))
    mapping = {
        ("darwin", "arm64"): "darwin-arm64",
        ("darwin", "amd64"): "darwin-x86_64",
        ("win32", "arm64"): "win32-arm64",
        ("win32", "amd64"): "win32-amd64",
    }
    subdir = mapping.get(target)
    if subdir:
        return subdir

    raise RuntimeError(
        "Unsupported Claude Desktop bundle target: "
        f"platform={sys.platform!r}, machine={platform.machine()!r}"
    )


def main() -> None:
    vendor_dir = VENDOR_ROOT / _detect_vendor_subdir()
    if not vendor_dir.is_dir():
        raise RuntimeError(f"Missing bundled dependencies: {vendor_dir}")

    sys.path.insert(0, str(vendor_dir))
    runpy.run_path(str(MAIN_PATH), run_name="__main__")


if __name__ == "__main__":
    main()
