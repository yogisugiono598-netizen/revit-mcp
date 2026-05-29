import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetIfElementsPassFilterTool(server: McpServer) {
  server.tool(
    "get_if_elements_pass_filter",
    "Test whether elements pass (match) a specific view filter. Returns a boolean per element. This is a diagnostic tool for answering questions like 'why doesn't this element appear in the view?' or 'which elements are being caught by filter X?'. Returns an array of {elementId, passesFilter: boolean}.",
    {
      list_elementIds: z
        .array(z.number().int())
        .describe("Array of element IDs to test against the filter"),
      filterId: z
        .number()
        .int()
        .describe(
          "The element ID of the view filter to test against. Get filter IDs from get_graphic_filters_applied_to_views."
        ),
    },
    async (args, extra) => {
      const params = {
        list_elementIds: args.list_elementIds,
        filterId: args.filterId,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_if_elements_pass_filter",
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
              text: `get_if_elements_pass_filter failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
