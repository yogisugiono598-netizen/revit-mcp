import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetModelCategoriesTool(server: McpServer) {
  server.tool(
    "get_model_categories",
    "Get all categories (ID and name) present in the current Revit model. Returns a complete inventory of every category used. Use this to discover available categoryIds for other tools like get_all_used_families_of_category. Unlike ai_element_filter which searches by keyword, this returns ALL categories without filtering. Returns an array of {categoryId, categoryName}.",
    {},
    async (args, extra) => {
      const params = {};

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_model_categories",
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
              text: `get_model_categories failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
