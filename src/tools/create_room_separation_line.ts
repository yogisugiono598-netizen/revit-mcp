import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

const pointSchema = z.object({
  x: z.number().describe("X coordinate in millimeters"),
  y: z.number().describe("Y coordinate in millimeters"),
  z: z.number().describe("Z coordinate in millimeters"),
});

export function registerCreateRoomSeparationLineTool(server: McpServer) {
  server.tool(
    "create_room_separation_line",
    "Draw room separation lines for open plan areas. Used to define room boundaries where no walls exist. All coordinates in millimeters.",
    {
      lines: z
        .array(
          z.object({
            startPoint: pointSchema
              .describe("Start point of the separation line in millimeters"),
            endPoint: pointSchema
              .describe("End point of the separation line in millimeters"),
            levelId: z
              .number()
              .int()
              .optional()
              .describe("Level element ID. If not provided, uses the active view's level"),
          })
        )
        .describe("Array of room separation line definitions"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_room_separation_line", params);
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
              text: `Room separation line creation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
