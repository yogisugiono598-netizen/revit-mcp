import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetAdditionalPropertyForAllElementIdsTool(server: McpServer) {
  server.tool(
    "get_additional_property_for_all_elementids",
    "Read a single Revit API-level property (not a Revit parameter) for multiple elements at once. This accesses properties from Revit API classes that are not exposed as standard parameters. For example: .Location, .HandFlipped, .FacingFlipped, .Pinned, .IsHidden, .LevelId, .OwnerViewId. Use this when get_parameter_value_for_element_ids doesn't return the value you're looking for.",
    {
      list_elementIds: z
        .array(z.number().int())
        .describe("Array of element IDs to read the property from"),
      propertyName: z
        .string()
        .describe(
          "The Revit API property name to read (e.g., 'LevelId', 'HandFlipped', 'FacingFlipped', 'Pinned', 'IsHidden', 'OwnerViewId')"
        ),
    },
    async (args, extra) => {
      const params = {
        list_elementIds: args.list_elementIds,
        propertyName: args.propertyName,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_additional_property_for_all_elementids",
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
              text: `get_additional_property_for_all_elementids failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
