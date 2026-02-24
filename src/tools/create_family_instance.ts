import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

const pointSchema = z.object({
  x: z.number().describe("X coordinate in millimeters"),
  y: z.number().describe("Y coordinate in millimeters"),
  z: z.number().describe("Z coordinate in millimeters"),
});

export function registerCreateFamilyInstanceTool(server: McpServer) {
  server.tool(
    "create_family_instance",
    "Place family instances (furniture, fixtures, equipment, generic models) at specified locations. Supports batch placement with rotation and host assignment. All coordinates in millimeters.",
    {
      instances: z
        .array(
          z.object({
            familyTypeId: z
              .number()
              .int()
              .describe("Family type element ID (use get_available_family_types to find IDs)"),
            location: pointSchema
              .describe("Placement location in millimeters"),
            levelId: z
              .number()
              .int()
              .describe("Level element ID for the instance placement"),
            rotation: z
              .number()
              .optional()
              .default(0)
              .describe("Rotation angle in degrees (counter-clockwise from X-axis). Default: 0"),
            hostId: z
              .number()
              .int()
              .optional()
              .describe("Host element ID for face-based or wall-hosted families (e.g., wall ID for a door)"),
          })
        )
        .describe("Array of family instance placements"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_family_instance", params);
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
              text: `Family instance placement failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
