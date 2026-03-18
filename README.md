# Nowledge Mem Claude Desktop Extension

One-click Claude Desktop integration for Nowledge Mem on macOS and Windows, with no separate Python installation required. After installation, Claude can search your memories, save important context, and update existing knowledge during any conversation.

## Demo Screenshots

![Add Memory](https://github.com/user-attachments/assets/45dd1aa5-2bab-4626-a40f-04f6e9a46612)

![Search Memories](https://github.com/user-attachments/assets/cebed3bb-b6f6-41b5-9593-b8d3411d5f85)

https://github.com/user-attachments/assets/a99a1daa-e73c-429e-a17b-0183b2f9671a

For more details, please refer to the [Nowledge Mem Documentation](https://mem.nowledge.co/docs).

## End User Installation

> See also the end user installation details at [Nowledge Mem Documentation: Claude Desktop](https://mem.nowledge.co/docs/integrations/claude-desktop).

1. Make sure Nowledge Mem is already running on the same machine, and update Claude Desktop to the latest version.
2. Download the Nowledge Mem Claude Desktop extension and double-click the `.mcpb` file to install it.
3. Restart Claude Desktop once after installation.

![Install Nowledge Mem Claude Desktop Extension](https://github.com/user-attachments/assets/34ac758d-8cc7-4bb8-9f3f-d41380a36ef9)

## Access Mem Anywhere (Remote Access)

By default the extension connects to your local Mem at `127.0.0.1:14242`.

For remote access, the extension reads the same shared config file as the `nmem` CLI:

- macOS / Linux: `~/.nowledge-mem/config.json`
- Windows: `%USERPROFILE%\\.nowledge-mem\\config.json`

If you start **Access Anywhere** from Nowledge Mem Desktop on the same machine, this file is usually written for you automatically.

If you need to point Claude Desktop at a remote Mem manually, create the file with:

```json
{
  "apiUrl": "https://mem.example.com",
  "apiKey": "nmem_your_key"
}
```

Restart Claude Desktop after changing the file.

## Troubleshooting

1. In Claude Desktop, click the `+` button in the chat box and open **Connectors** to confirm **Nowledge Mem** appears.
2. If it does not, open **Settings → Extensions → Advanced Settings** and inspect the extension status and logs there.
3. If you're using Access Anywhere, verify the shared config file above points to the correct URL and key.

## Build From Source

The extension uses the Node runtime that ships with Claude Desktop, so end users do not need to install Python or Node.

```bash
npm ci
npm test
npm run pack
```

For maintainers:

- `npm run build` bundles the bridge into `dist/index.js`
- `npm test` rebuilds and runs the end-to-end MCP forwarding checks
- `npm run pack` builds and creates the final `.mcpb`
- `npm ci` also installs the pinned `mcpb` packer locally, so `npx @anthropic-ai/mcpb pack` resolves to the tested version inside this repo
- the release archive excludes `node_modules/`, source files, and stale Python artifacts

<details>
<summary><strong>Show Metadata Content</strong></summary>

> mcp-name: io.github.nowledge-co/server.json

</details>
