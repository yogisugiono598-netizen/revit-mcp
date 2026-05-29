import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetAllWorksetInformationTool(server: McpServer) {
  server.tool(
    "get_all_workset_information",
    "Get a complete inventory of all worksets in the Revit workshared model. Returns workset ID, name, owner, creator, kind (UserCreated/View/Family/ProjectStandards/Unknown), isOpen, isEditable, and isDefault for each workset. This is the foundational worksharing tool — essential for multi-user environments and firms using Revit collaboration. Returns an array of {worksetId, name, owner, creator, kind, isOpen, isEditable, isDefault}.",
    {},
    async (args, extra) => {
      const params = {};

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_all_workset_information",
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
              text: `get_all_workset_information failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
