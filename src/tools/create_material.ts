import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerCreateMaterialTool(server: McpServer) {
  server.tool(
    "create_material",
    "Create or update a Revit material with color, fill patterns (hatch), and transparency. If a material with the same name already exists, its properties will be updated. Use this before create_element_type to prepare materials for wall/floor/roof layers. Returns a list of available fill pattern names in the model for reference.",
    {
      name: z
        .string()
        .describe(
          "Material name (e.g., 'Bata Merah', 'Plester', 'Beton K-300', 'Keramik 60x60')"
        ),
      color: z
        .array(z.number().int().min(0).max(255))
        .length(3)
        .optional()
        .describe(
          "RGB color array [R, G, B] (0-255). e.g., [180, 60, 40] for brick red, [200, 200, 200] for light grey"
        ),
      transparency: z
        .number()
        .int()
        .min(0)
        .max(100)
        .optional()
        .describe("Transparency percentage (0=opaque, 100=fully transparent). Default: 0"),
      surfacePatternName: z
        .string()
        .optional()
        .describe(
          "Surface (projection) fill pattern name. Use exact Revit pattern names like '<Solid fill>', 'Diagonal Crosshatch', 'Horizontal', 'Sand', 'Earth', 'Brick', 'Concrete', etc. Partial matching supported (e.g., 'Solid' matches '<Solid fill>')"
        ),
      surfacePatternColor: z
        .array(z.number().int().min(0).max(255))
        .length(3)
        .optional()
        .describe("RGB color for surface pattern [R, G, B]"),
      cutPatternName: z
        .string()
        .optional()
        .describe(
          "Cut fill pattern name (shown when element is cut in section). Same pattern names as surfacePatternName"
        ),
      cutPatternColor: z
        .array(z.number().int().min(0).max(255))
        .length(3)
        .optional()
        .describe("RGB color for cut pattern [R, G, B]"),
    },
    async (args, extra) => {
      const params: Record<string, unknown> = {
        name: args.name,
      };

      if (args.color) params.color = args.color;
      if (args.transparency !== undefined)
        params.transparency = args.transparency;
      if (args.surfacePatternName)
        params.surfacePatternName = args.surfacePatternName;
      if (args.surfacePatternColor)
        params.surfacePatternColor = args.surfacePatternColor;
      if (args.cutPatternName) params.cutPatternName = args.cutPatternName;
      if (args.cutPatternColor)
        params.cutPatternColor = args.cutPatternColor;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_material", params);
        });

        if (response.success) {
          let resultText = `Material '${response.materialName}' ${response.isNew ? "CREATED" : "UPDATED"} successfully.\n`;
          resultText += `Material ID: ${response.materialId}\n`;

          if (
            response.availableFillPatterns &&
            response.availableFillPatterns.length > 0
          ) {
            resultText += `\nAvailable fill patterns in this model:\n`;
            for (const p of response.availableFillPatterns) {
              resultText += `  - ${p}\n`;
            }
          }

          return { content: [{ type: "text", text: resultText }] };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Material creation failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Material creation failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
