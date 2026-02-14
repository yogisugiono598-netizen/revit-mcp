import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetSchedulesInfoAndColumnsTool(server: McpServer) {
  server.tool(
    "get_schedules_info_and_columns",
    "Get schedule information including column definitions, field types, and metadata. Lists all schedules in the model or specific schedules by ID. Useful for automated BOQ export, room schedule analysis, door/window schedule review, and documentation workflows.",
    {
      scheduleIds: z
        .array(z.number().int())
        .optional()
        .describe(
          "Specific schedule IDs to query. If not provided, returns all schedules in the model"
        ),
      includeColumnDetails: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Whether to include detailed column/field information for each schedule"
        ),
    },
    async (args, extra) => {
      const params = {
        scheduleIds: args.scheduleIds || [],
        includeColumnDetails: args.includeColumnDetails ?? true,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_schedules_info_and_columns",
            params
          );
        });

        if (response.success) {
          let resultText = `# Schedules Report\n\n`;
          resultText += `Total Schedules: ${response.schedules.length}\n`;

          for (const sched of response.schedules) {
            resultText += `\n## ${sched.name} (ID: ${sched.id})\n`;
            resultText += `- Category: ${sched.category || "N/A"}\n`;

            if (sched.columns && sched.columns.length > 0) {
              resultText += `- Columns (${sched.columns.length}):\n`;
              for (const col of sched.columns) {
                resultText += `  - **${col.heading}** (${col.fieldType}${col.isHidden ? ", hidden" : ""})\n`;
              }
            }
          }

          return { content: [{ type: "text", text: resultText }] };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Schedule query failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Schedule query failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
