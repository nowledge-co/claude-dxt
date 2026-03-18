import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTDIR = path.join(ROOT, "dist");

await fs.rm(OUTDIR, { recursive: true, force: true });

await build({
  entryPoints: [path.join(ROOT, "src/index.js")],
  outfile: path.join(OUTDIR, "index.js"),
  bundle: true,
  format: "esm",
  logLevel: "info",
  platform: "node",
  sourcemap: false,
  target: "node18",
});
