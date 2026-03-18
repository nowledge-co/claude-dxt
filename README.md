# Nowledge Mem Claude Desktop Extension

One-click Claude Desktop integration for Nowledge Mem on macOS and Windows. After installation, Claude can search your memories, save important context, and update existing knowledge during any conversation.

## Demo Screenshots

![Add Memory](https://github.com/user-attachments/assets/45dd1aa5-2bab-4626-a40f-04f6e9a46612)

![Search Memories](https://github.com/user-attachments/assets/cebed3bb-b6f6-41b5-9593-b8d3411d5f85)

https://github.com/user-attachments/assets/a99a1daa-e73c-429e-a17b-0183b2f9671a

For more details, please refer to the [Nowledge Mem Documentation](https://mem.nowledge.co/docs).

## End User Installation

> See also the end user installation details at [Nowledge Mem Documentation: Claude Desktop](https://mem.nowledge.co/docs/integrations/claude-desktop).

1. Make sure Nowledge Mem is already running on the same machine, and update Claude Desktop to the latest version.
2. Install Python 3.13.
   - macOS: `python3.13 --version || brew install python@3.13`
   - Windows: make sure `py -3.13 --version` works in Command Prompt or PowerShell.
3. Download the Nowledge Mem Claude Desktop extension and double-click the `.mcpb` file to install it.
4. Restart Claude Desktop once after installation.

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

The bundle uses system Python 3.13 plus vendored dependencies so the same repository can produce macOS and Windows builds with the public MCPB toolchain.

Build on the target OS in a clean checkout, or remove `server/lib` before repacking so old platform wheels do not leak into the archive.

macOS:

```bash
rm -rf server/lib
mkdir -p server/lib
python3.13 -m pip install -r requirements.txt --upgrade --target server/lib
npx @anthropic-ai/mcpb pack
```

Windows:

```powershell
Remove-Item server/lib -Recurse -Force -ErrorAction SilentlyContinue
New-Item server/lib -ItemType Directory | Out-Null
py -3.13 -m pip install -r requirements.txt --upgrade --target server/lib
npx @anthropic-ai/mcpb pack
```

<details>
<summary><strong>Show Metadata Content</strong></summary>

> mcp-name: io.github.nowledge-co/server.json

</details>
