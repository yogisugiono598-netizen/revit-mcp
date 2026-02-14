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

### Enhancement #8 — Tier 1: BIM Coordination & QC (DONE & TESTED, 2026-02-14)
- **`set_parameter_value_for_elements`** — Bulk parameter edit (same/different values per element)
- **`get_all_warnings_in_the_model`** — QC automation (severity filter, element IDs, category grouping)
- **`get_material_layers_from_types`** — Compound structure layers (material, thickness, function)
- **`get_graphic_overrides_for_element_ids_in_view`** — Read graphic overrides (colors, weights, transparency)
- Files: `set_parameter_value_for_elements.ts`, `get_all_warnings_in_the_model.ts`, `get_material_layers_from_types.ts`, `get_graphic_overrides_for_element_ids_in_view.ts`
- C# side: 4 new Command + EventHandler pairs in commandset

### Enhancement #9 — Tier 2: Documentation & Optimization (DONE & TESTED, 2026-02-14)
- **`get_schedules_info_and_columns`** — Schedule metadata (columns, field types, category)
- **`set_graphic_overrides_for_elements_in_view`** — Set/reset graphic overrides (colors, weights, transparency, halftone)
- **`get_size_in_mb_of_families`** — Family file sizes via export (sortable by size/instances/types)
- **`get_viewports_and_schedules_on_sheets`** — Sheet composition QC (viewports, schedules, view types)
- Files: `get_schedules_info_and_columns.ts`, `set_graphic_overrides_for_elements_in_view.ts`, `get_size_in_mb_of_families.ts`, `get_viewports_and_schedules_on_sheets.ts`
- C# side: 4 new Command + EventHandler pairs in commandset

### Enhancement #10 — Tier 3: BIM Authoring (DONE, 2026-02-14)
- **`create_material`** — Create/update Revit materials (color, transparency, surface/cut fill patterns)
- **`create_element_type`** — Create new element types by duplicating & customizing (compound layers for wall/floor/roof/ceiling, parameters for column/beam). Supports Indonesian construction standards.
- Files: `src/tools/create_material.ts`, `src/tools/create_element_type.ts`
- C# side: 2 new Command + EventHandler pairs in commandset

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
| set_parameter_value_for_elements | set_parameter_value_for_elements.ts | WORKS (Tested #8) |
| get_all_warnings_in_the_model | get_all_warnings_in_the_model.ts | WORKS (Tested #8) |
| get_material_layers_from_types | get_material_layers_from_types.ts | WORKS (Tested #8) |
| get_graphic_overrides_for_element_ids_in_view | get_graphic_overrides_for_element_ids_in_view.ts | WORKS (Tested #8) |
| get_schedules_info_and_columns | get_schedules_info_and_columns.ts | WORKS (Tested #9) |
| set_graphic_overrides_for_elements_in_view | set_graphic_overrides_for_elements_in_view.ts | WORKS (Tested #9) |
| get_size_in_mb_of_families | get_size_in_mb_of_families.ts | WORKS (Tested #9) |
| get_viewports_and_schedules_on_sheets | get_viewports_and_schedules_on_sheets.ts | WORKS (Tested #9) |
| create_material | create_material.ts | NEW (#10) |
| create_element_type | create_element_type.ts | NEW (#10) |

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
- `src/tools/set_parameter_value_for_elements.ts` — Bulk parameter editing
- `src/tools/get_all_warnings_in_the_model.ts` — Model QC warnings
- `src/tools/get_material_layers_from_types.ts` — Material layer composition
- `src/tools/get_graphic_overrides_for_element_ids_in_view.ts` — Read graphic overrides
- `src/tools/get_schedules_info_and_columns.ts` — Schedule metadata
- `src/tools/set_graphic_overrides_for_elements_in_view.ts` — Set graphic overrides
- `src/tools/get_size_in_mb_of_families.ts` — Family file sizes
- `src/tools/get_viewports_and_schedules_on_sheets.ts` — Sheet composition
- `src/tools/create_material.ts` — Material creation/update with colors and patterns
- `src/tools/create_element_type.ts` — Element type creation (compound layers / family parameters)
- `src/connection/SocketClient.ts` — JSON-RPC socket communication
- `src/connection/ConnectionManager.ts` — Connection lifecycle

## Important Notes
- Parameters are passed **as-is** from TypeScript to C# via JSON-RPC. No transformation.
- If a new parameter is added to TypeScript schema, the C# model MUST also be updated.
- Build both projects after changes: MCP server (`npm run build`) + C# plugin (`dotnet build -c "Debug R26"`).
- After build, restart Revit + Claude Desktop to load changes.
