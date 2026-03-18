import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const BRIDGE_ENTRY = path.resolve("src/index.js");

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

test("bridge proxies tools over stdio using shared remote config", async (t) => {
  const tempHome = await fs.promises.mkdtemp(path.join(os.tmpdir(), "claude-dxt-home-"));
  await fs.promises.mkdir(path.join(tempHome, ".nowledge-mem"), { recursive: true });

  let observedHeaders = null;

  const httpServer = http.createServer(async (req, res) => {
    if (req.url === "/mcp" && req.method === "GET") {
      res.writeHead(405, { "content-type": "application/json" }).end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Method not allowed.",
          },
          id: null,
        })
      );
      return;
    }

    if (req.url !== "/mcp" || req.method !== "POST") {
      res.writeHead(404).end();
      return;
    }

    observedHeaders = req.headers;

    const parsedBody = await readJsonBody(req);
    const server = new McpServer({ name: "mock-mem", version: "1.0.0" });
    server.registerTool(
      "ping_bridge",
      {
        description: "Verify that the Claude Desktop bridge proxies to Mem",
        inputSchema: {},
      },
      async () => ({
        content: [{ type: "text", text: "bridge-ok" }],
      })
    );
    server.registerResource(
      "Knowledge Graph Explorer",
      "ui://nowledge/graph-explorer.html",
      {
        description: "Inline graph UI",
        mimeType: "text/html;profile=mcp-app",
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.toString(),
            mimeType: "text/html;profile=mcp-app",
            text: "<html><body>graph-ok</body></html>",
          },
        ],
      })
    );
    server.registerPrompt(
      "save_memory",
      {
        description: "Test prompt bridge",
      },
      async () => ({
        description: "Prompt bridge works",
        messages: [
          {
            role: "assistant",
            content: {
              type: "text",
              text: "prompt-ok",
            },
          },
        ],
      })
    );

    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(500).end();
      }
      throw error;
    }
  });

  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Mock server did not expose a TCP port");
  }

  let client;
  t.after(async () => {
    if (client) {
      await client.close();
    }
    await new Promise((resolve, reject) => httpServer.close((error) => (error ? reject(error) : resolve())));
    await fs.promises.rm(tempHome, { recursive: true, force: true });
  });

  const remoteUrl = `http://127.0.0.1:${address.port}`;
  await fs.promises.writeFile(
    path.join(tempHome, ".nowledge-mem", "config.json"),
    JSON.stringify({ apiUrl: `${remoteUrl}/remote-api`, apiKey: "nmem_test_key" }),
    "utf8"
  );

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [BRIDGE_ENTRY],
    cwd: path.resolve("."),
    env: {
      HOME: tempHome,
      USERPROFILE: tempHome,
    },
    stderr: "pipe",
  });
  client = new Client({ name: "claude-dxt-test", version: "1.0.0" });

  const stderrChunks = [];
  transport.stderr?.on("data", (chunk) => stderrChunks.push(chunk.toString("utf8")));

  await client.connect(transport);

  const tools = await client.listTools();
  assert.deepEqual(
    tools.tools.map((tool) => tool.name),
    ["ping_bridge"]
  );

  const resources = await client.listResources();
  assert.deepEqual(
    resources.resources.map((resource) => resource.uri),
    ["ui://nowledge/graph-explorer.html"]
  );

  const resource = await client.readResource({ uri: "ui://nowledge/graph-explorer.html" });
  assert.equal(resource.contents[0].mimeType, "text/html;profile=mcp-app");
  assert.equal(resource.contents[0].text, "<html><body>graph-ok</body></html>");

  const prompts = await client.listPrompts();
  assert.deepEqual(
    prompts.prompts.map((prompt) => prompt.name),
    ["save_memory"]
  );

  const prompt = await client.getPrompt({ name: "save_memory" });
  assert.equal(prompt.messages[0].content.type, "text");
  assert.equal(prompt.messages[0].content.text, "prompt-ok");

  const result = await client.callTool({ name: "ping_bridge", arguments: {} });
  assert.equal(result.isError, undefined);
  assert.equal(result.content[0].type, "text");
  assert.equal(result.content[0].text, "bridge-ok");

  assert.equal(observedHeaders?.app, "Claude");
  assert.equal(observedHeaders?.authorization, "Bearer nmem_test_key");
  assert.equal(observedHeaders?.["x-nmem-api-key"], "nmem_test_key");
  assert.ok(
    stderrChunks.some((line) => line.includes(`Connecting to remote: ${remoteUrl}`)),
    `expected remote connection log in stderr, got: ${stderrChunks.join("")}`
  );
});
