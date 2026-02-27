# Nowledge Mem Claude Desktop Extension

## Demo Screenshots

![Add Memory](https://github.com/user-attachments/assets/45dd1aa5-2bab-4626-a40f-04f6e9a46612)

![Search Memories](https://github.com/user-attachments/assets/cebed3bb-b6f6-41b5-9593-b8d3411d5f85)

https://github.com/user-attachments/assets/a99a1daa-e73c-429e-a17b-0183b2f9671a

For more details, please refer to the [Nowledge Mem Documentation](https://mem.nowledge.co/docs).

## End User Installation

> See also the end user installation details at [Nowledge Mem Documentation: Claude Desktop](https://mem.nowledge.co/docs/integrations#claude-desktop).

1. Install Python 3.13

```bash
which brew || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
python3.13 --version || brew install python@3.13
```

1. Download Nowledge Mem Claude Desktop Extension and double click to install.

![Install Nowledge Mem Claude Desktop Extension](https://github.com/user-attachments/assets/34ac758d-8cc7-4bb8-9f3f-d41380a36ef9)

## Access Mem Anywhere (Remote Access)

By default the extension connects to your local Mem at `localhost:14242`. To connect to a remote Mem instance via [Access Anywhere](https://mem.nowledge.co/docs/remote-access):

1. Open **Settings → Access Mem Anywhere** in Nowledge Mem Desktop and start a tunnel.
2. Copy the **URL** and **API Key**.
3. In Claude Desktop, open the Nowledge Mem extension settings and fill in:
   - **Remote URL** — your Access Anywhere URL (e.g. `https://mem.example.com`)
   - **API Key** — your Mem API key (`nmem_...`)
4. Restart Claude Desktop.

Leave both fields empty to use local Mem (the default).

## Build the MCP bundle

> [!NOTE]
>
> Python 3.13 is required due to CPython Bug on leveraging dependencies in lib folder.

```bash
brew install python@3.13

python3.13 -m pip install -r requirements.txt -U --target server/lib

npx @anthropic-ai/mcpb pack
```

<details>
<summary><strong>Show Metadata Content</strong></summary>

> mcp-name: io.github.nowledge-co/server.json

</details>
