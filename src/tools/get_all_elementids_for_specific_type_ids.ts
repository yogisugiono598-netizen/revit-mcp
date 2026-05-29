import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetAllElementIdsForSpecificTypeIdsTool(server: McpServer) {
  server.tool(
    "get_all_elementids_for_specific_type_ids",
    "Get all instance element IDs for specific type IDs (reverse lookup: 'give me all elements that use type X'). This completes the Type → Instances direction of navigation. Maximum 50 type IDs per request. Can be slow for types with many instances. Returns per type: an array of instance elementIds.",
    {
      list_elementIds: z
        .array(z.number().int())
        .max(50)
        .describe(
          "Array of TYPE element IDs (not instance IDs) to find all instances for. Maximum 50 type IDs. Get type IDs from get_element_types_for_elementids or get_all_used_types_of_families."
        ),
    },
    async (args, extra) => {
      const params = {
        list_elementIds: args.list_elementIds,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_all_elementids_for_specific_type_ids",
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
              text: `get_all_elementids_for_specific_type_ids failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
