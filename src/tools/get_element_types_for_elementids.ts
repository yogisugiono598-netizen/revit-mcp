import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetElementTypesForElementIdsTool(server: McpServer) {
  server.tool(
    "get_element_types_for_elementids",
    "Get the type ID and type name for each instance element (reverse lookup: 'what type is this element?'). This is the essential first step in the Instance → Type → Family navigation chain. Without this, AI cannot answer questions like 'what type is this wall?' or 'how many elements use type X?'. Returns an array of {elementId, typeId, typeName, count}.",
    {
      list_elementIds: z
        .array(z.number().int())
        .describe("Array of instance element IDs to look up types for"),
    },
    async (args, extra) => {
      const params = {
        list_elementIds: args.list_elementIds,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_element_types_for_elementids",
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
              text: `get_element_types_for_elementids failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
