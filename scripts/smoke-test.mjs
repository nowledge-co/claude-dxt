import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import * as z from "zod/v4";

async function startMockRemoteServer() {
  const app = createMcpExpressApp();
  let observedHeaders = null;

  app.post("/mcp", async (req, res) => {
    observedHeaders = req.headers;

    const server = new McpServer({
      name: "mock-nowledge-mem",
      version: "1.0.0",
    });

    server.registerTool(
      "echo_memory",
      {
        description: "Echo test payload",
        inputSchema: {
          value: z.string(),
        },
      },
      async ({ value }) => ({
        content: [
          {
            type: "text",
            text: `echo:${value}`,
          },
        ],
      })
    );

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/mcp", (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    });
  });

  const listener = await new Promise((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.once("error", reject);
  });

  const address = listener.address();
  if (!address || typeof address === "string") {
    throw new Error("Mock server did not expose a TCP port");
  }

  return {
    headers: () => observedHeaders,
    url: `http://127.0.0.1:${address.port}/remote-api`,
    close: () =>
      new Promise((resolve, reject) => {
        listener.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

async function main() {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "claude-dxt-smoke-"));
  const configDir = path.join(tempHome, ".nowledge-mem");
  await fs.mkdir(configDir, { recursive: true });

  const remote = await startMockRemoteServer();
  await fs.writeFile(
    path.join(configDir, "config.json"),
    JSON.stringify(
      {
        apiUrl: remote.url,
        apiKey: "nmem_test_key",
      },
      null,
      2
    )
  );

  const client = new Client({
    name: "claude-dxt-smoke",
    version: "1.0.0",
  });

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(process.cwd(), "dist/index.js")],
    env: {
      HOME: tempHome,
      PATH: process.env.PATH ?? "",
      USERPROFILE: tempHome,
    },
    stderr: "pipe",
  });

  try {
    await client.connect(transport);

    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === "echo_memory"), "echo_memory tool was not forwarded");

    const result = await client.callTool({
      name: "echo_memory",
      arguments: {
        value: "bridge-ok",
      },
    });

    const text = result.content.find((item) => item.type === "text")?.text;
    assert.equal(text, "echo:bridge-ok");

    const headers = remote.headers();
    assert.equal(headers?.app, "Claude");
    assert.equal(headers?.authorization, "Bearer nmem_test_key");
    assert.equal(headers?.["x-nmem-api-key"], "nmem_test_key");
  } finally {
    await client.close();
    await remote.close();
    await fs.rm(tempHome, { recursive: true, force: true });
  }

  process.stdout.write("Smoke test passed.\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
