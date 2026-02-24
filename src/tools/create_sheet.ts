import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerCreateSheetTool(server: McpServer) {
  server.tool(
    "create_sheet",
    "Create sheets with title blocks. Supports batch creation and SNI numbering conventions (e.g., A-101, S-201).",
    {
      sheets: z
        .array(
          z.object({
            sheetNumber: z
              .string()
              .describe("Sheet number (e.g., 'A-101', 'S-201', 'AR-01')"),
            sheetName: z
              .string()
              .describe("Sheet name (e.g., 'Denah Lantai 1', 'Floor Plan Level 1')"),
            titleBlockTypeId: z
              .number()
              .int()
              .optional()
              .describe("Title block type element ID. If not provided, uses titleBlockFamilyName or first available"),
            titleBlockFamilyName: z
              .string()
              .optional()
              .describe("Title block family name to use (e.g., 'A1 metric'). Used when titleBlockTypeId is not specified"),
          })
        )
        .describe("Array of sheet definitions to create"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_sheet", params);
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
              text: `Sheet creation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
