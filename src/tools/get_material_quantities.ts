import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetMaterialQuantitiesTool(server: McpServer) {
  server.tool(
    "get_material_quantities",
    "Get material quantity takeoffs from the current Revit model. Returns material names, areas, volumes, and element counts. Can filter by categories or selected elements only. Useful for cost estimation, material scheduling, and quantity surveying.",
    {
      categoryFilters: z
        .array(z.string())
        .optional()
        .describe(
          "Filter by specific Revit categories (e.g., ['OST_Walls', 'OST_Floors', 'OST_Columns', 'OST_Roofs']). If not provided, all categories are included."
        ),
      selectedElementsOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "If true, only calculate quantities for currently selected elements"
        ),
    },
    async (args, extra) => {
      const params = {
        categoryFilters: args.categoryFilters || [],
        selectedElementsOnly: args.selectedElementsOnly ?? false,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_material_quantities",
            params
          );
        });

        if (response.success) {
          let resultText = `# Material Quantities\n\n`;
          resultText += `- Total Materials: ${response.totalMaterials}\n`;
          resultText += `- Total Area: ${response.totalArea} sq ft\n`;
          resultText += `- Total Volume: ${response.totalVolume} cu ft\n\n`;

          if (response.materials && response.materials.length > 0) {
            for (const mat of response.materials) {
              resultText += `## ${mat.materialName}\n`;
              resultText += `- Class: ${mat.materialClass}\n`;
              resultText += `- Area: ${mat.area} sq ft | Volume: ${mat.volume} cu ft\n`;
              resultText += `- Used in ${mat.elementCount} elements\n`;
              resultText += `\n`;
            }
          }

          return {
            content: [{ type: "text", text: resultText }],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Material quantity extraction failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Material quantity extraction failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
