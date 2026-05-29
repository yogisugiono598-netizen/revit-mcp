import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetCategoriesFromElementIdsTool(server: McpServer) {
  server.tool(
    "get_categories_from_elementids",
    "Get the category ID and category name for a list of elements (batch reverse lookup: 'what category are these elements?'). Useful when you have a selection of elements and need to know their categories. Maximum 1000 elements per request. Note: ai_element_filter can filter BY category; this tool is for reverse lookup from existing element selections. Returns an array of {elementId, categoryId, categoryName}.",
    {
      list_elementIds: z
        .array(z.number().int())
        .max(1000)
        .describe(
          "Array of element IDs to get categories for. Maximum 1000 items."
        ),
    },
    async (args, extra) => {
      const params = {
        list_elementIds: args.list_elementIds,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_categories_from_elementids",
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
              text: `get_categories_from_elementids failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
