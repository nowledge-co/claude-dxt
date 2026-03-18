import test from "node:test";
import assert from "node:assert/strict";

import {
  createHeaders,
  buildMcpUrl,
  readConfigValue,
  resolveApiKey,
  resolveApiUrl,
  resolveBaseUrl,
  normalizeMcpPath,
  stripLegacyRemoteApiPrefix,
} from "../src/index.js";

const withClearedEnv = (t) => {
  const previousUrl = process.env.NMEM_API_URL;
  const previousKey = process.env.NMEM_API_KEY;
  delete process.env.NMEM_API_URL;
  delete process.env.NMEM_API_KEY;
  t.after(() => {
    if (previousUrl === undefined) {
      delete process.env.NMEM_API_URL;
    } else {
      process.env.NMEM_API_URL = previousUrl;
    }
    if (previousKey === undefined) {
      delete process.env.NMEM_API_KEY;
    } else {
      process.env.NMEM_API_KEY = previousKey;
    }
  });
};

test("stripLegacyRemoteApiPrefix removes the legacy gateway prefix", (t) => {
  withClearedEnv(t);
  assert.equal(
    stripLegacyRemoteApiPrefix("https://mem.example.com/remote-api/").toString(),
    "https://mem.example.com/"
  );
  assert.equal(
    stripLegacyRemoteApiPrefix("https://mem.example.com/remote-api/mcp").toString(),
    "https://mem.example.com/mcp"
  );
});

test("normalizeMcpPath preserves explicit MCP endpoints and appends when needed", (t) => {
  withClearedEnv(t);
  assert.equal(normalizeMcpPath("https://mem.example.com").toString(), "https://mem.example.com/mcp");
  assert.equal(normalizeMcpPath("https://mem.example.com/space").toString(), "https://mem.example.com/space/mcp");
  assert.equal(normalizeMcpPath("https://mem.example.com/mcp/").toString(), "https://mem.example.com/mcp");
});

test("resolveApiUrl prefers shared config keys and normalizes trailing slashes", (t) => {
  withClearedEnv(t);
  assert.equal(
    resolveApiUrl({ apiUrl: "https://mem.example.com/remote-api/" }),
    "https://mem.example.com"
  );
  assert.equal(
    resolveApiUrl({ api_url: "https://mem.example.com/" }),
    "https://mem.example.com"
  );
});

test("resolveApiKey and headers preserve the shared auth contract", (t) => {
  withClearedEnv(t);
  assert.equal(resolveApiKey({ apiKey: "nmem_test_key" }), "nmem_test_key");
  assert.equal(readConfigValue({ api_key: "alt_key" }, "apiKey", "api_key"), "alt_key");

  const headers = createHeaders("nmem_test_key");
  assert.equal(headers.Authorization, "Bearer nmem_test_key");
  assert.equal(headers["X-NMEM-API-Key"], "nmem_test_key");
  assert.equal(headers.APP, "Claude");
  assert.equal(headers["X-Nmem-Client"], "claude-dxt");
});

test("buildMcpUrl only appends /mcp for configured remote servers", (t) => {
  withClearedEnv(t);
  assert.equal(buildMcpUrl("https://mem.example.com/mcp"), "https://mem.example.com/mcp");
  assert.equal(buildMcpUrl("https://mem.example.com/remote-base"), "https://mem.example.com/remote-base/mcp");
  assert.equal(resolveBaseUrl({ apiUrl: "https://mem.example.com" }), "https://mem.example.com/mcp");
  assert.equal(resolveBaseUrl({ apiUrl: "https://mem.example.com/mcp/" }), "https://mem.example.com/mcp");
  assert.equal(
    resolveBaseUrl({ apiUrl: "https://mem.example.com/remote-api/mcp/" }),
    "https://mem.example.com/mcp"
  );
  assert.equal(resolveBaseUrl({}), "http://127.0.0.1:14242/mcp");
});
