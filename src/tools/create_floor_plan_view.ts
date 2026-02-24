import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerCreateFloorPlanViewTool(server: McpServer) {
  server.tool(
    "create_floor_plan_view",
    "Create floor plan views per level with auto view template and scale. Supports batch creation with configurable detail levels.",
    {
      views: z
        .array(
          z.object({
            levelId: z
              .number()
              .int()
              .describe("Element ID of the level to create a floor plan view for"),
            name: z
              .string()
              .optional()
              .describe("Custom view name. If not provided, uses default Revit naming"),
            scale: z
              .number()
              .int()
              .optional()
              .default(100)
              .describe("View scale denominator (e.g., 100 for 1:100, 50 for 1:50). Default: 100"),
            viewTemplateId: z
              .number()
              .int()
              .optional()
              .describe("View template element ID to apply to the view"),
            detailLevel: z
              .enum(["Coarse", "Medium", "Fine"])
              .optional()
              .describe("View detail level: Coarse, Medium, or Fine"),
          })
        )
        .describe("Array of floor plan view definitions to create"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_floor_plan_view", params);
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
              text: `Floor plan view creation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
