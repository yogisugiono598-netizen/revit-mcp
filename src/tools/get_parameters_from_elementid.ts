import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetParametersFromElementIdTool(server: McpServer) {
  server.tool(
    "get_parameters_from_elementid",
    "Read ALL parameters and properties from a single element. This is equivalent to the Properties panel in the Revit UI. Essential for debugging and full element inspection. Returns an array of {paramName, paramValue, paramType, isReadOnly} for every parameter the element has. Use this when you need to discover what parameters an element has or when the user asks 'what are the properties of element X?'",
    {
      elementId: z
        .number()
        .int()
        .describe("The element ID to inspect all parameters from"),
    },
    async (args, extra) => {
      const params = {
        elementId: args.elementId,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_parameters_from_elementid",
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
              text: `get_parameters_from_elementid failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
