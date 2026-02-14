import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetGraphicOverridesForElementIdsInViewTool(
  server: McpServer
) {
  server.tool(
    "get_graphic_overrides_for_element_ids_in_view",
    "Read the current graphic override settings for specific elements in a view. Returns projection/cut line colors, line weights, transparency, halftone, and surface pattern color settings. Useful for verifying presentation consistency across drawing sets.",
    {
      elementIds: z
        .array(z.number().int())
        .describe("Array of element IDs to query graphic overrides for"),
      viewId: z
        .number()
        .int()
        .optional()
        .describe(
          "View ID to check overrides in. If not specified, uses the current active view"
        ),
    },
    async (args, extra) => {
      const params = {
        elementIds: args.elementIds,
        viewId: args.viewId ?? -1,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_graphic_overrides_for_element_ids_in_view",
            params
          );
        });

        if (response.success) {
          let resultText = `# Graphic Overrides Report\n\n`;
          resultText += `- View: ${response.viewName}\n`;
          resultText += `- Elements queried: ${response.elements.length}\n`;

          for (const elem of response.elements) {
            resultText += `\n## Element ${elem.elementId} — ${elem.elementName}\n`;
            if (elem.hasOverrides) {
              const o = elem.overrides;
              if (o.projectionLineColor)
                resultText += `- Projection Line Color: RGB(${o.projectionLineColor.r}, ${o.projectionLineColor.g}, ${o.projectionLineColor.b})\n`;
              if (o.cutLineColor)
                resultText += `- Cut Line Color: RGB(${o.cutLineColor.r}, ${o.cutLineColor.g}, ${o.cutLineColor.b})\n`;
              if (o.projectionLineWeight >= 0)
                resultText += `- Projection Line Weight: ${o.projectionLineWeight}\n`;
              if (o.cutLineWeight >= 0)
                resultText += `- Cut Line Weight: ${o.cutLineWeight}\n`;
              if (o.transparency > 0)
                resultText += `- Transparency: ${o.transparency}%\n`;
              if (o.halftone) resultText += `- Halftone: Yes\n`;
              if (o.surfaceForegroundColor)
                resultText += `- Surface FG Color: RGB(${o.surfaceForegroundColor.r}, ${o.surfaceForegroundColor.g}, ${o.surfaceForegroundColor.b})\n`;
            } else {
              resultText += `- No overrides applied\n`;
            }
          }

          return { content: [{ type: "text", text: resultText }] };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Graphic override query failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Graphic override query failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
