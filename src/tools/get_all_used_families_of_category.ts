import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetAllUsedFamiliesOfCategoryTool(server: McpServer) {
  server.tool(
    "get_all_used_families_of_category",
    "Get all families of a specific category in the model. More targeted than get_all_used_families_in_model. For example: get all door families (OST_Doors), all furniture families (OST_Furniture), all lighting fixture families (OST_LightingFixtures). Combine with get_category_by_keyword to find the right categoryId. Returns an array of {familyId, familyName, count}.",
    {
      categoryId: z
        .number()
        .int()
        .describe(
          "The Revit built-in category integer ID. For example: OST_Doors = -2000023, OST_Windows = -2000014, OST_Furniture = -2001100, OST_LightingFixtures = -2001370. Use get_model_categories to find the correct ID."
        ),
    },
    async (args, extra) => {
      const params = {
        categoryId: args.categoryId,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_all_used_families_of_category",
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
              text: `get_all_used_families_of_category failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
