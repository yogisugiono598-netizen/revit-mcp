import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

const colorSchema = z.object({
  r: z.number().int().min(0).max(255).describe("Red (0-255)"),
  g: z.number().int().min(0).max(255).describe("Green (0-255)"),
  b: z.number().int().min(0).max(255).describe("Blue (0-255)"),
});

export function registerSetGraphicOverridesForElementsInViewTool(
  server: McpServer
) {
  server.tool(
    "set_graphic_overrides_for_elements_in_view",
    "Set graphic override settings for elements in a view. Control projection/cut line colors, line weights, surface colors, transparency, and halftone. Useful for automating presentation coloring by phase, department, material, or design option. Can also reset all overrides.",
    {
      elementIds: z
        .array(z.number().int())
        .describe("Array of element IDs to apply graphic overrides to"),
      projectionLineColor: colorSchema
        .optional()
        .describe("Projection line color as RGB"),
      cutLineColor: colorSchema.optional().describe("Cut line color as RGB"),
      projectionLineWeight: z
        .number()
        .int()
        .min(1)
        .max(16)
        .optional()
        .describe("Projection line weight (1-16)"),
      cutLineWeight: z
        .number()
        .int()
        .min(1)
        .max(16)
        .optional()
        .describe("Cut line weight (1-16)"),
      surfaceForegroundColor: colorSchema
        .optional()
        .describe("Surface foreground pattern color as RGB"),
      surfaceBackgroundColor: colorSchema
        .optional()
        .describe("Surface background pattern color as RGB"),
      transparency: z
        .number()
        .int()
        .min(0)
        .max(100)
        .optional()
        .describe("Surface transparency (0=opaque, 100=fully transparent)"),
      halftone: z
        .boolean()
        .optional()
        .describe("Whether to apply halftone to the elements"),
      viewId: z
        .number()
        .int()
        .optional()
        .describe(
          "View ID to apply overrides in. If not specified, uses the current active view"
        ),
      resetOverrides: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "If true, resets all graphic overrides for the specified elements instead of setting them"
        ),
    },
    async (args, extra) => {
      const params: Record<string, unknown> = {
        elementIds: args.elementIds,
        viewId: args.viewId ?? -1,
        resetOverrides: args.resetOverrides || false,
      };
      if (args.projectionLineColor)
        params.projectionLineColor = args.projectionLineColor;
      if (args.cutLineColor) params.cutLineColor = args.cutLineColor;
      if (args.projectionLineWeight !== undefined)
        params.projectionLineWeight = args.projectionLineWeight;
      if (args.cutLineWeight !== undefined)
        params.cutLineWeight = args.cutLineWeight;
      if (args.surfaceForegroundColor)
        params.surfaceForegroundColor = args.surfaceForegroundColor;
      if (args.surfaceBackgroundColor)
        params.surfaceBackgroundColor = args.surfaceBackgroundColor;
      if (args.transparency !== undefined)
        params.transparency = args.transparency;
      if (args.halftone !== undefined) params.halftone = args.halftone;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "set_graphic_overrides_for_elements_in_view",
            params
          );
        });

        if (response.success) {
          let resultText = args.resetOverrides
            ? `Successfully reset graphic overrides for ${response.updatedCount} elements.\n`
            : `Successfully applied graphic overrides to ${response.updatedCount} elements.\n`;
          resultText += `- View: ${response.viewName}\n`;

          return { content: [{ type: "text", text: resultText }] };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Graphic override operation failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Graphic override operation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
