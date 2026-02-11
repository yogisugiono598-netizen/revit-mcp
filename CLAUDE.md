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

### Enhancement #4 — Data Extraction Tools (DONE, 2026-02-11)
- **New MCP tools** wrapping existing C# commands:
  - `analyze_model_statistics` — Model statistics (element/type/family counts, levels, categories)
  - `export_room_data` — Room data export (area, volume, perimeter, department)
  - `get_material_quantities` — Material quantity takeoffs (area, volume per material)
- Files: `src/tools/analyze_model_statistics.ts`, `src/tools/export_room_data.ts`, `src/tools/get_material_quantities.ts`
- MCP-only change — C# handlers already existed in commandset

### Enhancement #5 — Generic Tagging (DONE, 2026-02-11)
- **New tool** `create_tag` — Tag any element category (Walls, Doors, Windows, Rooms, Floors, etc.)
- Auto-detects tag type from element category, supports explicit tagTypeId override
- File: `src/tools/create_tag.ts`
- C# side: new `CreateTagCommand.cs` + `CreateTagEventHandler.cs` in commandset

### Enhancement #6 — View Management (DONE, 2026-02-11)
- **New tool** `create_view` — Create FloorPlan, CeilingPlan, Elevation, Section, 3D views
- Configurable: name, scale, detail level, level elevation, view template
- File: `src/tools/create_view.ts`
- C# side: new `CreateViewCommand.cs` + `CreateViewEventHandler.cs` in commandset

### Enhancement #7 — Cleanup (DONE, 2026-02-11)
- Removed empty/unused files: `modify_element.ts`, `search_modules.ts`, `use_module.ts`, `createWall.ts`

## Available Tools
| Tool | File | Status |
|------|------|--------|
| get_current_view_info | built-in | WORKS |
| get_current_view_elements | built-in | WORKS |
| get_available_family_types | built-in | WORKS |
| get_selected_elements | built-in | WORKS |
| ai_element_filter | built-in | WORKS |
| create_line_based_element | built-in | WORKS |
| create_point_based_element | built-in | WORKS |
| create_surface_based_element | built-in | WORKS |
| create_grid | built-in | WORKS |
| create_dimensions | create_dimensions.ts | WORKS (Enhanced #3) |
| operate_element | operate_element.ts | WORKS (Enhanced #1 & #2) |
| delete_element | built-in | WORKS |
| color_elements | color_elements.ts | WORKS |
| tag_all_walls | tag_all_walls.ts | WORKS |
| send_code_to_revit | built-in | WORKS |
| store_project_data | built-in | WORKS |
| store_room_data | built-in | WORKS |
| query_stored_data | built-in | WORKS |
| analyze_model_statistics | analyze_model_statistics.ts | NEW (#4) |
| export_room_data | export_room_data.ts | NEW (#4) |
| get_material_quantities | get_material_quantities.ts | NEW (#4) |
| create_tag | create_tag.ts | NEW (#5) |
| create_view | create_view.ts | NEW (#6) |

## Build & Deploy
```bash
npm run build        # Compile TypeScript → build/
npx tsc --noEmit     # Type-check only (no output)
```
Claude Desktop config references this server in its MCP settings.

## Key Files to Know
- `src/tools/create_dimensions.ts` — Dimension tool schema (chainPoints, textOverride, Angular etc)
- `src/tools/operate_element.ts` — Element operations (Move/Rotate/Copy/Mirror/SetParameter/Rename)
- `src/tools/create_tag.ts` — Generic tagging for any category
- `src/tools/create_view.ts` — View creation (FloorPlan, CeilingPlan, Elevation, Section, 3D)
- `src/tools/analyze_model_statistics.ts` — Model statistics extraction
- `src/tools/export_room_data.ts` — Room data export
- `src/tools/get_material_quantities.ts` — Material quantity takeoffs
- `src/connection/SocketClient.ts` — JSON-RPC socket communication
- `src/connection/ConnectionManager.ts` — Connection lifecycle

## Important Notes
- Parameters are passed **as-is** from TypeScript to C# via JSON-RPC. No transformation.
- If a new parameter is added to TypeScript schema, the C# model MUST also be updated.
- Build both projects after changes: MCP server (`npm run build`) + C# plugin (`dotnet build -c "Debug R26"`).
- After build, restart Revit + Claude Desktop to load changes.
