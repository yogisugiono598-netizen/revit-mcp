import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetWorksharingInformationForElementIdsTool(server: McpServer) {
  server.tool(
    "get_worksharing_information_for_element_ids",
    "Get detailed worksharing information for each element, including workset assignment, current owner, who last changed it, and checkout status. Deeper than get_worksets_from_elementids — includes ownership and edit status. Essential for conflict resolution in multi-user environments: 'who has checked out this element?' or 'which elements have been modified by user X?'. Returns an array of {elementId, worksetName, owner, lastChangedBy, checkoutStatus}.",
    {
      list_elementIds: z
        .array(z.number().int())
        .describe(
          "Array of element IDs to get detailed worksharing information for"
        ),
    },
    async (args, extra) => {
      const params = {
        list_elementIds: args.list_elementIds,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_worksharing_information_for_element_ids",
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
              text: `get_worksharing_information_for_element_ids failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
