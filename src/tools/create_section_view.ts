import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

const pointSchema = z.object({
  x: z.number().describe("X coordinate in millimeters"),
  y: z.number().describe("Y coordinate in millimeters"),
  z: z.number().describe("Z coordinate in millimeters"),
});

export function registerCreateSectionViewTool(server: McpServer) {
  server.tool(
    "create_section_view",
    "Create section view at specified cut line with auto crop and naming. Define section by start and end points of the cut line. All dimensions in millimeters.",
    {
      name: z
        .string()
        .describe("Section view name (e.g., 'Section A-A', 'Potongan A-A', 'Cross Section 1')"),
      startPoint: pointSchema
        .describe("Start point of the section cut line in millimeters"),
      endPoint: pointSchema
        .describe("End point of the section cut line in millimeters"),
      depth: z
        .number()
        .optional()
        .default(5000)
        .describe("View depth (how far the section looks) in millimeters. Default: 5000"),
      height: z
        .number()
        .optional()
        .describe("Section crop height in millimeters. Default: 15000mm (15m). If not provided, uses 15000mm instead of auto-calculating from full model extents which can result in excessively large sections."),
      scale: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe("View scale denominator (e.g., 50 for 1:50, 100 for 1:100). Default: 50"),
      viewTemplateId: z
        .number()
        .int()
        .optional()
        .describe("View template element ID to apply to the section view"),
    },
    async (args, extra) => {
      const finalParams = { ...args, height: args.height ?? 15000 };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_section_view", finalParams);
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
              text: `Section view creation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
