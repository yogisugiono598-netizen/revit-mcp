import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetAllUsedTypesOfFamiliesTool(server: McpServer) {
  server.tool(
    "get_all_used_types_of_families",
    "Get all type variants for one or more families. For example, family 'Basic Wall' → types 'Generic 200mm', 'Generic 150mm', 'Exterior - Brick on CMU', etc. Works with both system families (Wall, Floor, Ceiling) AND loadable families. Maximum 30 family names per request. Returns per family: an array of {typeId, typeName, count}.",
    {
      familyNames: z
        .array(z.string())
        .max(30)
        .describe(
          "Array of family names to get types for. Maximum 30 names. Works with system families (e.g., 'Basic Wall', 'Floor') and loadable families. Family names must match exactly as they appear in Revit."
        ),
    },
    async (args, extra) => {
      const params = {
        familyNames: args.familyNames,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_all_used_types_of_families",
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
              text: `get_all_used_types_of_families failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
