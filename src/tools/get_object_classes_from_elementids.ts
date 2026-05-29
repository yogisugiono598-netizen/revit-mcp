import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetObjectClassesFromElementIdsTool(server: McpServer) {
  server.tool(
    "get_object_classes_from_elementids",
    "Get the Revit API class name for each element. Examples: Wall, FamilyInstance, Room, ViewPlan, Floor, Ceiling, MEPCurve, HostedSweep. Useful for AI decision-making: determine which tools are applicable based on element class. For example, only FamilyInstance elements can be queried with family-specific tools. Returns an array of {elementId, className}.",
    {
      list_elementIds: z
        .array(z.number().int())
        .describe("Array of element IDs to get Revit API class names for"),
    },
    async (args, extra) => {
      const params = {
        list_elementIds: args.list_elementIds,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_object_classes_from_elementids",
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
              text: `get_object_classes_from_elementids failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
