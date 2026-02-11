import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerCreateGridTool(server: McpServer) {
  server.tool(
    "create_grid",
    "Create a grid system in Revit with configurable X and Y axis grid lines. Supports alphabetic (A,B,C...) or numeric (1,2,3...) naming. All units are in millimeters (mm).",
    {
      xCount: z
        .number()
        .int()
        .min(1)
        .describe("Number of grid lines along X-axis (vertical grids)"),
      xSpacing: z
        .number()
        .positive()
        .describe("Spacing between X-axis grid lines in millimeters"),
      xStartLabel: z
        .string()
        .optional()
        .default("A")
        .describe("Starting label for X-axis grids (e.g., 'A' or '1')"),
      xNamingStyle: z
        .enum(["alphabetic", "numeric"])
        .optional()
        .default("alphabetic")
        .describe("Naming style for X-axis: 'alphabetic' (A,B,C...) or 'numeric' (1,2,3...)"),
      yCount: z
        .number()
        .int()
        .min(1)
        .describe("Number of grid lines along Y-axis (horizontal grids)"),
      ySpacing: z
        .number()
        .positive()
        .describe("Spacing between Y-axis grid lines in millimeters"),
      yStartLabel: z
        .string()
        .optional()
        .default("1")
        .describe("Starting label for Y-axis grids (e.g., '1' or 'A')"),
      yNamingStyle: z
        .enum(["alphabetic", "numeric"])
        .optional()
        .default("numeric")
        .describe("Naming style for Y-axis: 'alphabetic' (A,B,C...) or 'numeric' (1,2,3...)"),
      xExtentMin: z
        .number()
        .optional()
        .default(0)
        .describe("Minimum extent along X-axis in mm (grid line start)"),
      xExtentMax: z
        .number()
        .optional()
        .default(50000)
        .describe("Maximum extent along X-axis in mm (grid line end)"),
      yExtentMin: z
        .number()
        .optional()
        .default(0)
        .describe("Minimum extent along Y-axis in mm (grid line start)"),
      yExtentMax: z
        .number()
        .optional()
        .default(50000)
        .describe("Maximum extent along Y-axis in mm (grid line end)"),
      xStartPosition: z
        .number()
        .optional()
        .default(0)
        .describe("Starting position for first X-axis grid in mm"),
      yStartPosition: z
        .number()
        .optional()
        .default(0)
        .describe("Starting position for first Y-axis grid in mm"),
      elevation: z
        .number()
        .optional()
        .default(0)
        .describe("Elevation for grid lines in mm (Z-coordinate)"),
    },
    async (args, extra) => {
      const params = args;
      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_grid", params);
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
              text: `Grid creation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
