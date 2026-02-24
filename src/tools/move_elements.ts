import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerMoveElementsTool(server: McpServer) {
  server.tool(
    "move_elements",
    "Move or copy elements by translation vector. Simpler dedicated alternative to operate_element for move/copy operations. All dimensions in millimeters.",
    {
      elementIds: z
        .array(
          z.number().int().describe("Element ID to move or copy")
        )
        .describe("Array of element IDs to move or copy"),
      translation: z
        .object({
          x: z.number().describe("X translation in millimeters"),
          y: z.number().describe("Y translation in millimeters"),
          z: z.number().describe("Z translation in millimeters"),
        })
        .describe("Translation vector in millimeters"),
      copyInstead: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, copies elements instead of moving them. Default: false"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("move_elements", params);
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
              text: `Move elements failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
