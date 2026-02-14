import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetViewportsAndSchedulesOnSheetsTool(
  server: McpServer
) {
  server.tool(
    "get_viewports_and_schedules_on_sheets",
    "Get all viewports and schedule instances placed on sheets. Returns sheet name/number, placed view names with types and scales, and schedule instances. Useful for verifying sheet composition, coordination drawing set QC, and checking that all required views are placed.",
    {
      sheetIds: z
        .array(z.number().int())
        .optional()
        .describe(
          "Specific sheet IDs to query. If not provided, returns all sheets in the model"
        ),
    },
    async (args, extra) => {
      const params = {
        sheetIds: args.sheetIds || [],
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_viewports_and_schedules_on_sheets",
            params
          );
        });

        if (response.success) {
          let resultText = `# Sheet Composition Report\n\n`;
          resultText += `Total Sheets: ${response.sheets.length}\n`;

          for (const sheet of response.sheets) {
            resultText += `\n## ${sheet.sheetNumber} — ${sheet.sheetName} (ID: ${sheet.id})\n`;

            if (sheet.viewports && sheet.viewports.length > 0) {
              resultText += `- Viewports (${sheet.viewports.length}):\n`;
              for (const vp of sheet.viewports) {
                resultText += `  - ${vp.viewName} (${vp.viewType}, scale 1:${vp.scale})\n`;
              }
            } else {
              resultText += `- No viewports\n`;
            }

            if (sheet.schedules && sheet.schedules.length > 0) {
              resultText += `- Schedules (${sheet.schedules.length}):\n`;
              for (const s of sheet.schedules) {
                resultText += `  - ${s.scheduleName}\n`;
              }
            }
          }

          return { content: [{ type: "text", text: resultText }] };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Sheet query failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Sheet query failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
