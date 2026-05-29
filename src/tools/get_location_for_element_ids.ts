import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetLocationForElementIdsTool(server: McpServer) {
  server.tool(
    "get_location_for_element_ids",
    "Get the location coordinates for each element. Point-based elements (columns, furniture, doors) return XYZ coordinates. Line-based elements (walls, beams, pipes) return start and end points. This is the most commonly needed tool for spatial queries, clash detection, and coordinate-based operations. Returns per element: {locationPoint: {x, y, z}} or {locationCurve: {start: {x, y, z}, end: {x, y, z}}}. All coordinates are in millimeters.",
    {
      list_elementIds: z
        .array(z.number().int())
        .describe("Array of element IDs to get locations for"),
    },
    async (args, extra) => {
      const params = {
        list_elementIds: args.list_elementIds,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_location_for_element_ids",
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
              text: `get_location_for_element_ids failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
