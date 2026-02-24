import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerApplyViewTemplateTool(server: McpServer) {
  server.tool(
    "apply_view_template",
    "Apply view template to views for consistent visual output. Specify template by ID or name. Supports batch application to multiple views.",
    {
      viewIds: z
        .array(
          z.number().int().describe("View element ID to apply the template to")
        )
        .describe("Array of view element IDs to apply the template to"),
      templateId: z
        .number()
        .int()
        .optional()
        .describe("View template element ID. Takes priority over templateName if both are provided"),
      templateName: z
        .string()
        .optional()
        .describe("View template name (e.g., 'Architectural Plan', 'Structural Plan'). Used when templateId is not specified"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("apply_view_template", params);
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
              text: `Apply view template failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
