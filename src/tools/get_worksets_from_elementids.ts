import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetWorksetsFromElementIdsTool(server: McpServer) {
  server.tool(
    "get_worksets_from_elementids",
    "Get the workset assignment for each element ('which workset is this element in?'). Essential for multi-user coordination in workshared Revit projects. Common use case: 'list all elements in Workset MEP' or 'verify these elements are in the correct workset'. Returns an array of {elementId, worksetId, worksetName}.",
    {
      list_elementIds: z
        .array(z.number().int())
        .describe("Array of element IDs to get workset assignments for"),
    },
    async (args, extra) => {
      const params = {
        list_elementIds: args.list_elementIds,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_worksets_from_elementids",
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
              text: `get_worksets_from_elementids failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
