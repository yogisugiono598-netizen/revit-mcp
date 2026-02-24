import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerPlaceViewportOnSheetTool(server: McpServer) {
  server.tool(
    "place_viewport_on_sheet",
    "Place views on sheets at specified positions. Completes the documentation pipeline from model to printable sheets. All positions in millimeters.",
    {
      viewports: z
        .array(
          z.object({
            sheetId: z
              .number()
              .int()
              .describe("Sheet element ID to place the viewport on"),
            viewId: z
              .number()
              .int()
              .describe("View element ID to place on the sheet"),
            positionX: z
              .number()
              .describe("Viewport center X position on the sheet in millimeters"),
            positionY: z
              .number()
              .describe("Viewport center Y position on the sheet in millimeters"),
            viewportTypeId: z
              .number()
              .int()
              .optional()
              .describe("Viewport type element ID for custom title/border style"),
          })
        )
        .describe("Array of viewport placement definitions"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("place_viewport_on_sheet", params);
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
              text: `Viewport placement failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
