import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

const pointSchema = z.object({
  x: z.number().describe("X coordinate in millimeters"),
  y: z.number().describe("Y coordinate in millimeters"),
  z: z.number().describe("Z coordinate in millimeters"),
});

export function registerCreateRoomTool(server: McpServer) {
  server.tool(
    "create_room",
    "Create rooms at specified locations. Supports batch creation. All coordinates and dimensions in millimeters.",
    {
      rooms: z
        .array(
          z.object({
            name: z
              .string()
              .describe("Room name (e.g., 'Ruang Tamu', 'Kamar Tidur', 'Living Room')"),
            number: z
              .string()
              .optional()
              .describe("Room number (e.g., '101', 'A-01')"),
            location: pointSchema
              .describe("Room placement point in millimeters. Must be inside bounded area"),
            levelId: z
              .number()
              .int()
              .describe("Element ID of the level to place the room on"),
            height: z
              .number()
              .optional()
              .describe("Room upper limit height in millimeters. If not provided, uses level-to-level height"),
            department: z
              .string()
              .optional()
              .describe("Department assignment for the room (e.g., 'Private', 'Public', 'Service')"),
          })
        )
        .describe("Array of room definitions to create"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_room", params);
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
              text: `Room creation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
