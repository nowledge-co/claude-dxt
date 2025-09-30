# Nowledge Mem Claude Desktop Extension

## Build the MCP bundle

```bash
pip install -r requirements.txt --platform macosx_11_0_arm64 -U --target server/lib
npx @anthropic-ai/mcpb pack
```
