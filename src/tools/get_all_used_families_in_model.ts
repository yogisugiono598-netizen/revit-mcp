import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetAllUsedFamiliesInModelTool(server: McpServer) {
  server.tool(
    "get_all_used_families_in_model",
    "List all loadable families that are loaded in the current Revit model (excludes system families like Wall, Floor, Ceiling). Use this for a complete family inventory or audit. Returns an array of {familyId, familyName, count} where count is the number of instances placed in the model.",
    {},
    async (args, extra) => {
      const params = {};

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_all_used_families_in_model",
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
              text: `get_all_used_families_in_model failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
