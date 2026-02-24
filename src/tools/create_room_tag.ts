import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerCreateRoomTagTool(server: McpServer) {
  server.tool(
    "create_room_tag",
    "Tag rooms with name, number, and area. Leave roomIds empty to tag all rooms in the active view. Supports custom tag types.",
    {
      roomIds: z
        .array(z.number().int().describe("Room element ID"))
        .optional()
        .default([])
        .describe("Array of room element IDs to tag. Leave empty or omit to tag all rooms in the active view"),
      includeArea: z
        .boolean()
        .optional()
        .default(true)
        .describe("Whether to include area in the room tag. Default: true"),
      tagTypeId: z
        .number()
        .int()
        .optional()
        .describe("Specific room tag type ID. If not provided, uses the default room tag type"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_room_tag", params);
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
              text: `Room tagging failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
