# Nowledge Mem Claude Desktop Extension

## Demo Screenshots

![Add Memory](screenshots/demo2.png)

![Search Memories](screenshots/demo4.png)

For more details, please refer to the [Nowledge Mem Documentation](https://mem.nowledge.co/docs).

## End User Installation

1. Install Python 3.13

```bash
which brew || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install python@3.13
```

1. Download Nowledge Mem Claude Desktop Extension and double click to install.

![Install Nowledge Mem Claude Desktop Extension](screenshots/demo0.png)

## Build the MCP bundle

> [!NOTE]
>
> Python 3.13 is required due to CPython Bug on leveraging dependencies in lib folder.

```bash
brew install python@3.13

python3.13 -m pip install -r requirements.txt -U --target server/lib

npx @anthropic-ai/mcpb pack
```
