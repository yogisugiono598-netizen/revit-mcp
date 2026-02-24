import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGenerateRabTakeoffTool(server: McpServer) {
  server.tool(
    "generate_rab_takeoff",
    "Extract quantities organized by Indonesian RAB structure (12 categories). Generates material takeoff data for cost estimation following Indonesian construction cost standards.",
    {
      categories: z
        .array(
          z.string().describe("Revit category name (e.g., 'Walls', 'Floors', 'Doors', 'Windows', 'Roofs', 'Structural Columns')")
        )
        .optional()
        .default([])
        .describe("Array of Revit category names to include. Leave empty to include all categories"),
      includeUnitPrices: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, includes unit price columns in the output (requires price data in shared parameters). Default: false"),
      groupBy: z
        .enum(["category", "level", "rab_category"])
        .optional()
        .default("rab_category")
        .describe("Grouping method: category (by Revit category), level (by building level), rab_category (by Indonesian RAB 12-category structure). Default: rab_category"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("generate_rab_takeoff", params);
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
              text: `RAB takeoff generation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
