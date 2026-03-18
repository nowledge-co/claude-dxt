#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const VERSION = "1.4.3";
const LOCAL_URL = "http://127.0.0.1:14242/mcp";
const CLIENT_SESSION_ID = crypto.randomUUID().replace(/-/g, "");
const CONFIG_PATH = path.join(os.homedir(), ".nowledge-mem", "config.json");

export function resolveEnv(name) {
  const value = (process.env[name] ?? "").trim();
  return value.startsWith("${") ? "" : value;
}

export function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error(`[Nowledge Mem] Warning: could not read ${CONFIG_PATH}:`, error);
  }

  return {};
}

export function readConfigValue(config, ...keys) {
  for (const key of keys) {
    const value = config[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function stripLegacyRemoteApiPrefix(url) {
  const parsed = new URL(url);

  if (parsed.pathname === "/remote-api") {
    parsed.pathname = "/";
    return parsed;
  }

  if (parsed.pathname.startsWith("/remote-api/")) {
    parsed.pathname = parsed.pathname.slice("/remote-api".length);
  }

  return parsed;
}

export function normalizeMcpPath(url) {
  const parsed = new URL(url);
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";

  if (pathname === "/mcp") {
    parsed.pathname = "/mcp";
    return parsed;
  }

  parsed.pathname = pathname === "/" ? "/mcp" : `${pathname}/mcp`;
  return parsed;
}

export function resolveApiUrl(config) {
  const env = resolveEnv("NMEM_API_URL");
  if (env) {
    return stripLegacyRemoteApiPrefix(env).toString().replace(/\/$/, "");
  }

  const configured = readConfigValue(config, "apiUrl", "api_url");
  if (configured) {
    return stripLegacyRemoteApiPrefix(configured).toString().replace(/\/$/, "");
  }

  return "";
}

export function resolveApiKey(config) {
  const env = resolveEnv("NMEM_API_KEY");
  if (env) {
    return env;
  }

  return readConfigValue(config, "apiKey", "api_key");
}

export function createHeaders(apiKey) {
  const headers = {
    APP: "Claude",
    "X-Nmem-Client": "claude-dxt",
    "X-Nmem-Client-Session": CLIENT_SESSION_ID,
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
    headers["X-NMEM-API-Key"] = apiKey;
  }

  return headers;
}

export function buildMcpUrl(remoteUrl) {
  return remoteUrl ? normalizeMcpPath(remoteUrl).toString() : LOCAL_URL;
}

export function resolveBaseUrl(config) {
  const remoteUrl = resolveApiUrl(config);
  return buildMcpUrl(remoteUrl);
}

export async function createBridgeClient(config = loadConfig()) {
  const client = new Client({
    name: "nowledge-mem-claude-desktop",
    version: VERSION,
  });

  const transport = new StreamableHTTPClientTransport(new URL(resolveBaseUrl(config)), {
    requestInit: {
      headers: createHeaders(resolveApiKey(config)),
    },
  });

  await client.connect(transport);
  return client;
}

export function createBridgeCapabilities(client) {
  const upstream = client.getServerCapabilities?.() ?? {};
  const capabilities = {};

  if (upstream.tools) {
    capabilities.tools = {};
  }
  if (upstream.prompts) {
    capabilities.prompts = {};
  }
  if (upstream.resources) {
    capabilities.resources = {};
  }

  return capabilities;
}

export function createBridgeServer(client) {
  const server = new Server(
    { name: "nowledge-mem-claude-desktop", version: VERSION },
    { capabilities: createBridgeCapabilities(client) }
  );

  if (client.getServerCapabilities?.()?.tools) {
    server.setRequestHandler(ListToolsRequestSchema, async (request) => client.listTools(request.params));
    server.setRequestHandler(CallToolRequestSchema, async (request) => client.callTool(request.params));
  }

  if (client.getServerCapabilities?.()?.prompts) {
    server.setRequestHandler(ListPromptsRequestSchema, async (request) => client.listPrompts(request.params));
    server.setRequestHandler(GetPromptRequestSchema, async (request) => client.getPrompt(request.params));
  }

  if (client.getServerCapabilities?.()?.resources) {
    server.setRequestHandler(ListResourcesRequestSchema, async (request) => client.listResources(request.params));
    server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async (request) => client.listResourceTemplates(request.params)
    );
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => client.readResource(request.params));
    server.setRequestHandler(SubscribeRequestSchema, async (request) => client.subscribeResource(request.params));
    server.setRequestHandler(UnsubscribeRequestSchema, async (request) => client.unsubscribeResource(request.params));
  }

  return server;
}

export async function main() {
  const config = loadConfig();
  const remoteUrl = resolveApiUrl(config);

  if (remoteUrl) {
    console.error(`[Nowledge Mem] Connecting to remote: ${remoteUrl}`);
  } else if (fs.existsSync(CONFIG_PATH)) {
    console.error("[Nowledge Mem] No remote URL configured in shared Mem config, using local Mem");
  } else {
    console.error("[Nowledge Mem] Connecting to local Mem");
  }

  const client = await createBridgeClient(config);
  const server = createBridgeServer(client);
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  main().catch((error) => {
    console.error("[Nowledge Mem] Fatal error:", error);
    process.exit(1);
  });
}
