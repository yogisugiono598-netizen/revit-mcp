import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerCreateViewTool(server: McpServer) {
  server.tool(
    "create_view",
    "Create a new view in the Revit model. Supports FloorPlan, CeilingPlan, Elevation, Section, and 3D (isometric) view types. Views are created with configurable name, scale, detail level, and can be associated with a specific level.",
    {
      viewType: z
        .enum(["FloorPlan", "CeilingPlan", "Elevation", "Section", "3D"])
        .describe(
          "Type of view to create: FloorPlan, CeilingPlan, Elevation, Section, or 3D (isometric)"
        ),
      name: z
        .string()
        .optional()
        .describe("Name for the new view. If not provided, Revit assigns a default name"),
      levelElevation: z
        .number()
        .optional()
        .default(0)
        .describe(
          "Level elevation in mm (for FloorPlan and CeilingPlan). The closest existing level will be used. Default: 0 (first level)"
        ),
      scale: z
        .number()
        .int()
        .optional()
        .describe("View scale (e.g., 100 for 1:100, 50 for 1:50). If not provided, uses Revit default"),
      detailLevel: z
        .enum(["Coarse", "Medium", "Fine"])
        .optional()
        .describe("View detail level: Coarse, Medium, or Fine"),
      viewFamilyTypeName: z
        .string()
        .optional()
        .describe("Specific view family type name to use. If not provided, uses the first available type"),
      templateId: z
        .string()
        .optional()
        .describe("View template ID to apply to the new view"),
      direction: z
        .object({
          x: z.number().describe("X component"),
          y: z.number().describe("Y component"),
          z: z.number().describe("Z component"),
        })
        .optional()
        .describe("View direction vector (for Elevation and Section views). In mm coordinates"),
    },
    async (args, extra) => {
      const params = {
        viewType: args.viewType,
        name: args.name || "",
        levelElevation: args.levelElevation || 0,
        scale: args.scale || 0,
        detailLevel: args.detailLevel || "",
        viewFamilyTypeName: args.viewFamilyTypeName || "",
        templateId: args.templateId || "",
        direction: args.direction || null,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_view", params);
        });

        if (response.success) {
          let resultText = `View created successfully!\n`;
          resultText += `- View ID: ${response.viewId}\n`;
          resultText += `- Name: ${response.viewName}\n`;
          resultText += `- Type: ${response.viewType}\n`;
          resultText += `- Scale: 1:${response.scale}\n`;
          resultText += `- Detail Level: ${response.detailLevel}\n`;

          return {
            content: [{ type: "text", text: resultText }],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `View creation failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `View creation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
