import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetGraphicOverridesViewFiltersTool(server: McpServer) {
  server.tool(
    "get_graphic_overrides_view_filters",
    "Read detailed graphic override settings for specific view-filter pairs. Returns the exact override values for each filter: projection color, cut color, line pattern, fill pattern, line weight, and transparency. Use get_graphic_filters_applied_to_views first to discover filter IDs, then use this tool to read their exact settings. Critical for view template audit, QA documentation, and replicating overrides across views.",
    {
      list_viewIds: z
        .array(z.number().int())
        .describe("Array of view element IDs to query"),
      list_filterIds: z
        .array(z.number().int())
        .describe(
          "Array of filter element IDs to get override details for. Get filter IDs from get_graphic_filters_applied_to_views."
        ),
    },
    async (args, extra) => {
      const params = {
        list_viewIds: args.list_viewIds,
        list_filterIds: args.list_filterIds,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_graphic_overrides_view_filters",
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
              text: `get_graphic_overrides_view_filters failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
