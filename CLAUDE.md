# Revit MCP Server — Project Context

## Owner
Ahmad (Igoy) — Indonesia, GMT+7. Prefers Indonesian language.

## Project Overview
Node.js/TypeScript MCP server yang menghubungkan Claude Desktop dengan Autodesk Revit 2026 via socket connection (localhost:8080). Menggunakan JSON-RPC 2.0.

**Paired C# Plugin:** `D:\revit-mcp-commandset\` — Revit plugin yang menerima command dari MCP server ini.

## Architecture
```
Claude Desktop → MCP Server (this repo, stdio) → TCP Socket → Revit C# Plugin → Revit API
```

- `src/tools/` — Tool definitions (Zod schema + handler)
- `src/connection/` — Socket connection management (ConnectionManager.ts, SocketClient.ts)
- `build/` — Compiled output
- Protocol: JSON-RPC 2.0, params sent as-is to C# plugin

## Enhancement History

### Enhancement #1 — operate_element Actions (DONE, tested 2026-02-11)
- Added Move, Rotate, Copy, Mirror actions to `operate_element.ts`
- File: `src/tools/operate_element.ts`

### Enhancement #2 — SetParameter / Rename (DONE, tested 2026-02-11)
- Added SetParameter, Rename actions to `operate_element.ts`
- File: `src/tools/operate_element.ts`

### Enhancement #3 — Dimensions (DONE, tested 2026-02-11)
- Added `chainPoints`, `textOverride` parameters to `create_dimensions.ts`
- Added Angular, Radial, ArcLength, Diameter dimension types
- File: `src/tools/create_dimensions.ts`
- **MCP server side was already complete** — all changes for #3 were C# side only

## Available Tools
| Tool | File | Status |
|------|------|--------|
| get_current_view_info | built-in | WORKS |
| get_current_view_elements | built-in | WORKS |
| get_available_family_types | built-in | WORKS |
| create_line_based_element | built-in | WORKS |
| operate_element | operate_element.ts | WORKS (Enhanced #1 & #2) |
| create_dimensions | create_dimensions.ts | WORKS (Enhanced #3) |
| tag_all_walls | tag_all_walls.ts | WORKS |
| store_project_data | built-in | WORKS |
| store_room_data | built-in | WORKS |
| query_stored_data | built-in | WORKS |

## Build & Deploy
```bash
npm run build        # Compile TypeScript → build/
npx tsc --noEmit     # Type-check only (no output)
```
Claude Desktop config references this server in its MCP settings.

## Key Files to Know
- `src/tools/create_dimensions.ts` — Dimension tool schema (chainPoints, textOverride, Angular etc)
- `src/tools/operate_element.ts` — Element operations (Move/Rotate/Copy/Mirror/SetParameter/Rename)
- `src/connection/SocketClient.ts` — JSON-RPC socket communication
- `src/connection/ConnectionManager.ts` — Connection lifecycle

## Important Notes
- Parameters are passed **as-is** from TypeScript to C# via JSON-RPC. No transformation.
- If a new parameter is added to TypeScript schema, the C# `DimensionCreationInfo` model MUST also be updated.
- Build both projects after changes: MCP server (`npm run build`) + C# plugin (`dotnet build -c "Debug R26"`).
- After build, restart Revit + Claude Desktop to load changes.
