import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetProjectStandardsTool(server: McpServer) {
  server.tool(
    "get_project_standards",
    `Read current project standards configuration from Revit. Returns units, dimension types, text types, line patterns, structural settings (rebar covers, materials), level/grid naming, and sheet/title block info.

Use this to:
- Audit current project settings before making changes
- Compare with target standard (SNI, BS, Eurocode, etc.)
- Verify settings after configure_project_standards was applied`,
    {
      sections: z
        .array(
          z.enum([
            "units",
            "dimensions",
            "text",
            "lines",
            "structural",
            "naming",
            "sheets",
            "all",
          ])
        )
        .optional()
        .describe(
          'Sections to read. Default: ["all"]. Options: units, dimensions, text, lines, structural, naming, sheets, all'
        ),
    },
    async (args, extra) => {
      const params: Record<string, unknown> = {
        sections: args.sections ?? ["all"],
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_project_standards",
            params
          );
        });

        if (response.success) {
          let resultText = "=== PROJECT STANDARDS ===\n\n";

          if (response.units) {
            resultText += "## UNITS\n";
            resultText += `  Length: ${response.units.lengthUnit}\n`;
            resultText += `  Area: ${response.units.areaUnit}\n`;
            resultText += `  Volume: ${response.units.volumeUnit}\n`;
            resultText += `  Angle: ${response.units.angleUnit}\n`;
            resultText += `  Length accuracy: ${response.units.lengthAccuracy}\n\n`;
          }

          if (response.dimensions) {
            resultText += `## DIMENSION TYPES (${response.dimensions.length})\n`;
            for (const dt of response.dimensions) {
              resultText += `  - ${dt.name}: ${dt.textSizeMm}mm, font=${dt.font}, arrow=${dt.arrowStyle}\n`;
            }
            resultText += "\n";
          }

          if (response.text) {
            resultText += `## TEXT TYPES (${response.text.length})\n`;
            for (const tt of response.text) {
              resultText += `  - ${tt.name}: ${tt.sizeMm}mm, font=${tt.font}, bold=${tt.bold}, widthFactor=${tt.widthFactor}\n`;
            }
            resultText += "\n";
          }

          if (response.lines) {
            resultText += `## LINE PATTERNS (${response.lines.patterns?.length ?? 0})\n`;
            if (response.lines.patterns) {
              for (const lp of response.lines.patterns) {
                const segs = lp.segments
                  ?.map(
                    (s: { type: string; lengthMm: number }) =>
                      `${s.type}:${s.lengthMm}mm`
                  )
                  .join(", ");
                resultText += `  - ${lp.name}: [${segs}]\n`;
              }
            }
            resultText += "\n";
          }

          if (response.structural) {
            resultText += "## STRUCTURAL\n";
            if (response.structural.rebarCovers) {
              resultText += "  Rebar Covers:\n";
              for (const rc of response.structural.rebarCovers) {
                resultText += `    - ${rc.name}: ${rc.coverDistanceMm}mm\n`;
              }
            }
            if (response.structural.materials) {
              resultText += `  Structural Materials (${response.structural.materials.length}):\n`;
              for (const m of response.structural.materials) {
                resultText += `    - ${m.name} (ID: ${m.id})\n`;
              }
            }
            resultText += "\n";
          }

          if (response.naming) {
            resultText += "## NAMING\n";
            if (response.naming.levels) {
              resultText += "  Levels:\n";
              for (const lv of response.naming.levels) {
                resultText += `    - ${lv.name} (elevation: ${lv.elevationMm}mm)\n`;
              }
            }
            if (response.naming.grids) {
              resultText += `  Grids: ${response.naming.grids.join(", ")}\n`;
            }
            resultText += "\n";
          }

          if (response.sheets) {
            resultText += "## SHEETS & TITLE BLOCKS\n";
            if (response.sheets.titleBlocks) {
              resultText += "  Title Blocks:\n";
              for (const tb of response.sheets.titleBlocks) {
                resultText += `    - ${tb.familyName}: ${tb.typeName}\n`;
              }
            }
            if (response.sheets.sheets) {
              resultText += `  Sheets (${response.sheets.sheets.length}):\n`;
              for (const sh of response.sheets.sheets) {
                resultText += `    - ${sh.number}: ${sh.name}\n`;
              }
            }
            resultText += "\n";
          }

          return { content: [{ type: "text", text: resultText }] };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Failed to read project standards: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to read project standards: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
