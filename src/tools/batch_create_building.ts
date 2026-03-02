import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerBatchCreateBuildingTool(server: McpServer) {
  server.tool(
    "batch_create_building",
    "One-command building generation. Specify program, grid, levels - get complete model with walls, floors, and rooms. Ultimate automation for rapid prototyping. All dimensions in millimeters.",
    {
      levels: z
        .array(
          z.object({
            name: z
              .string()
              .describe("Level name (e.g., 'Lantai 1', 'Ground Floor')"),
            elevation: z
              .number()
              .describe("Level elevation in millimeters (e.g., 0, 4000, 8000)"),
          })
        )
        .describe("Array of level definitions with name and elevation in millimeters"),
      grid: z
        .object({
          xSpacing: z
            .number()
            .positive()
            .describe("Grid spacing along X-axis in millimeters"),
          ySpacing: z
            .number()
            .positive()
            .describe("Grid spacing along Y-axis in millimeters"),
          xCount: z
            .number()
            .int()
            .min(2)
            .describe("Number of grid lines along X-axis (minimum 2)"),
          yCount: z
            .number()
            .int()
            .min(2)
            .describe("Number of grid lines along Y-axis (minimum 2)"),
        })
        .describe("Structural grid definition in millimeters"),
      wallTypeId: z
        .number()
        .int()
        .optional()
        .describe("Wall type element ID for auto-generated walls. If not provided, uses default wall type"),
      floorTypeId: z
        .number()
        .int()
        .optional()
        .describe("Floor type element ID for auto-generated floors. If not provided, uses default floor type"),
      rooms: z
        .array(
          z.object({
            name: z
              .string()
              .describe("Room name (e.g., 'Ruang Tamu', 'Kamar Tidur')"),
            level: z
              .string()
              .describe("Level name this room belongs to (must match a level name in the levels array)"),
            area: z
              .number()
              .optional()
              .describe("Target room area in square millimeters (informational, used for validation)"),
          })
        )
        .optional()
        .describe("Array of room definitions to create within the building"),
      autoGenerateWalls: z
        .boolean()
        .optional()
        .default(true)
        .describe("Automatically generate perimeter walls along grid lines. Default: true"),
      autoGenerateFloors: z
        .boolean()
        .optional()
        .default(true)
        .describe("Automatically generate floor slabs at each level. Default: true"),
      originOffset: z
        .object({
          x: z.number().describe("X offset from project origin in millimeters"),
          y: z.number().describe("Y offset from project origin in millimeters"),
        })
        .optional()
        .default({ x: 0, y: 0 })
        .describe("Origin offset for the building placement. Use to avoid overlap with existing geometry. Default: {x: 0, y: 0}"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("batch_create_building", params);
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
              text: `Batch building creation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
