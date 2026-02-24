import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerLinkDwgTool(server: McpServer) {
  server.tool(
    "link_dwg",
    "Link or import DWG file as underlay with correct scale and level. Supports AutoCAD DWG files for site plans, surveys, and reference drawings.",
    {
      filePath: z
        .string()
        .describe("Full file path to the DWG file (e.g., 'D:\\\\drawings\\\\site_plan.dwg')"),
      levelId: z
        .number()
        .int()
        .optional()
        .describe("Level element ID to place the DWG on. If not provided, uses the active view's level"),
      placement: z
        .enum(["Origin", "Center", "Shared"])
        .optional()
        .default("Origin")
        .describe("Placement method: Origin (project origin), Center (center of view), Shared (shared coordinates). Default: Origin"),
      scaleUnit: z
        .enum(["Millimeter", "Centimeter", "Meter"])
        .optional()
        .default("Millimeter")
        .describe("Import unit scale: Millimeter, Centimeter, or Meter. Default: Millimeter"),
      isLink: z
        .boolean()
        .optional()
        .default(true)
        .describe("If true, links the DWG (maintains external reference). If false, imports (embeds into project). Default: true"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("link_dwg", params);
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
              text: `DWG link/import failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
