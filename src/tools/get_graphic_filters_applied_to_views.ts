import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetGraphicFiltersAppliedToViewsTool(server: McpServer) {
  server.tool(
    "get_graphic_filters_applied_to_views",
    "List all view filters applied to one or more views. Returns the filter name, visibility status, and enabled status for each filter. This complements the existing set_graphic_overrides tool by providing READ capability for existing filter configurations. Essential for view template audits and documentation QA workflows. Returns per view: an array of {filterId, filterName, isEnabled, isVisible}.",
    {
      list_viewIds: z
        .array(z.number().int())
        .describe("Array of view element IDs to get applied filters for"),
    },
    async (args, extra) => {
      const params = {
        list_viewIds: args.list_viewIds,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_graphic_filters_applied_to_views",
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
              text: `get_graphic_filters_applied_to_views failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
