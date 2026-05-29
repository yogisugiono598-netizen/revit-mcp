import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetHostIdForElementIdsTool(server: McpServer) {
  server.tool(
    "get_host_id_for_element_ids",
    "Get the host element ID for hosted elements. Examples: door → wall that contains it, window → wall, floor fixture → floor, ceiling fixture → ceiling. Essential for relationship queries like 'which wall does this door belong to?' or 'find all doors in wall X'. Maximum 200 elements per request. Returns an array of {elementId, hostId}.",
    {
      list_elementIds: z
        .array(z.number().int())
        .max(200)
        .describe(
          "Array of hosted element IDs to find hosts for. Maximum 200 items. Works for doors, windows, fixtures, and other host-dependent elements."
        ),
    },
    async (args, extra) => {
      const params = {
        list_elementIds: args.list_elementIds,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_host_id_for_element_ids",
            params
          );
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
              text: `get_host_id_for_element_ids failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
