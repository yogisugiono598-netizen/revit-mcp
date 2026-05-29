import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetAllAdditionalPropertiesFromElementIdTool(server: McpServer) {
  server.tool(
    "get_all_additional_properties_from_elementid",
    "Read ALL Revit API-level properties from a single element. This is a deep inspection tool that goes beyond standard Revit parameters and returns all accessible API properties of the element's class. Use this as a last resort when get_parameters_from_elementid doesn't return the value you need. Returns an array of {propertyName, value} for every accessible API property.",
    {
      elementId: z
        .number()
        .int()
        .describe("The element ID to inspect all API-level properties from"),
    },
    async (args, extra) => {
      const params = {
        elementId: args.elementId,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_all_additional_properties_from_elementid",
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
              text: `get_all_additional_properties_from_elementid failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
