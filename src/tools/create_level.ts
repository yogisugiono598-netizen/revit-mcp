import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerCreateLevelTool(server: McpServer) {
  server.tool(
    "create_level",
    "Create levels with optional auto floor plan views. Supports batch creation and SNI naming. All elevations in millimeters.",
    {
      levels: z
        .array(
          z.object({
            name: z
              .string()
              .describe("Level name (e.g., 'Lantai 1', 'Ground Floor', 'Level 1')"),
            elevation: z
              .number()
              .describe("Level elevation in millimeters (e.g., 0, 4000, 8000)"),
            isBuildingStory: z
              .boolean()
              .optional()
              .default(true)
              .describe("Whether this level is a building story. Default: true"),
          })
        )
        .describe("Array of level definitions to create"),
      createFloorPlanViews: z
        .boolean()
        .optional()
        .default(true)
        .describe("Automatically create floor plan views for each level. Default: true"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_level", params);
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Level creation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
