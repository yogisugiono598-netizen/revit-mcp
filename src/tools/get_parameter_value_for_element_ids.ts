import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetParameterValueForElementIdsTool(server: McpServer) {
  server.tool(
    "get_parameter_value_for_element_ids",
    "Read a single specific parameter value for multiple elements at once (batch read). For example, read 'Width' from 500 walls simultaneously. This is the read counterpart to set_parameter_value_for_elements. Returns an array of {elementId, parameterName, value} for each element.",
    {
      list_elementIds: z
        .array(z.number().int())
        .describe("Array of element IDs to read the parameter from"),
      parameterName: z
        .string()
        .describe(
          "The name of the parameter to read (e.g., 'Width', 'Height', 'Mark', 'Fire Rating', 'Comments')"
        ),
    },
    async (args, extra) => {
      const params = {
        list_elementIds: args.list_elementIds,
        parameterName: args.parameterName,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_parameter_value_for_element_ids",
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
              text: `get_parameter_value_for_element_ids failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
