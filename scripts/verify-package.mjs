import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const PACKAGE_PATH = path.join(ROOT, "claude-dxt.mcpb");

function npxCommand() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

async function collectFiles(rootDir, currentDir = rootDir) {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(rootDir, absolutePath)));
      continue;
    }
    files.push(path.relative(rootDir, absolutePath).replaceAll(path.sep, "/"));
  }

  return files.sort();
}

async function main() {
  await fs.access(PACKAGE_PATH);

  const unpackDir = await fs.mkdtemp(path.join(os.tmpdir(), "claude-dxt-package-"));
  try {
    await execFileAsync(
      npxCommand(),
      ["@anthropic-ai/mcpb", "unpack", PACKAGE_PATH, unpackDir],
      { cwd: ROOT }
    );

    const files = await collectFiles(unpackDir);
    assert.deepEqual(files, [
      "LICENSE",
      "dist/index.js",
      "icon.png",
      "manifest.json",
      "screenshots/demo0.png",
      "screenshots/demo1.png",
      "screenshots/demo2.png",
      "screenshots/demo3.png",
      "screenshots/demo4.png",
    ]);

    const manifest = JSON.parse(await fs.readFile(path.join(unpackDir, "manifest.json"), "utf8"));
    assert.equal(manifest.version, "1.4.2");
    assert.equal(manifest.server?.type, "node");
    assert.equal(manifest.server?.entry_point, "dist/index.js");
    assert.equal(manifest.server?.mcp_config?.command, "node");
    assert.deepEqual(manifest.server?.mcp_config?.args, ["${__dirname}/dist/index.js"]);
    assert.deepEqual(manifest.compatibility?.platforms, ["darwin", "win32"]);
    assert.equal(manifest.compatibility?.runtimes?.python, undefined);
    assert.equal(manifest.compatibility?.runtimes?.node, undefined);

    process.stdout.write("Package audit passed.\n");
  } finally {
    await fs.rm(unpackDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
