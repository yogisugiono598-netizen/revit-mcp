import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetAllElementsOfSpecificFamiliesTool(server: McpServer) {
  server.tool(
    "get_all_elements_of_specific_families",
    "Get all instance element IDs directly from family names, skipping the type lookup step. This is a shortcut for 'give me all elements from family X'. Maximum 30 family names per request. Family names must match exactly as they appear in Revit. Returns per family: an array of elementIds.",
    {
      familyNames: z
        .array(z.string())
        .max(30)
        .describe(
          "Array of family names to find all instances for. Maximum 30 names. Family names must match exactly as they appear in Revit (case-sensitive)."
        ),
    },
    async (args, extra) => {
      const params = {
        familyNames: args.familyNames,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_all_elements_of_specific_families",
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
              text: `get_all_elements_of_specific_families failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
