#!/usr/bin/env python3
"""Build a single Claude Desktop bundle with multi-platform Python deps."""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SERVER_LIB = ROOT / "server" / "lib"
REQUIREMENTS = ROOT / "requirements.txt"

TARGETS = {
    "darwin-arm64": {
        "platform": "macosx_11_0_arm64",
        "abi": "cp313",
    },
    "darwin-x86_64": {
        "platform": "macosx_10_13_x86_64",
        "abi": "cp313",
    },
    "win32-amd64": {
        "platform": "win_amd64",
        "abi": "cp313",
    },
    "win32-arm64": {
        "platform": "win_arm64",
        "abi": "cp313",
    },
}


def run(command: list[str]) -> None:
    subprocess.run(command, check=True, cwd=ROOT)


def build_target(target: str, platform_tag: str, abi: str) -> None:
    target_dir = SERVER_LIB / target
    if target_dir.exists():
        shutil.rmtree(target_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "-r",
            str(REQUIREMENTS),
            "--target",
            str(target_dir),
            "--only-binary=:all:",
            "--platform",
            platform_tag,
            "--python-version",
            "3.13",
            "--implementation",
            "cp",
            "--abi",
            abi,
            "--upgrade",
            "--no-compile",
        ]
    )


def main() -> None:
    if SERVER_LIB.exists():
        shutil.rmtree(SERVER_LIB)
    SERVER_LIB.mkdir(parents=True, exist_ok=True)
    for target, metadata in TARGETS.items():
        build_target(target, metadata["platform"], metadata["abi"])


if __name__ == "__main__":
    main()
