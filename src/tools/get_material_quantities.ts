import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";
import { sqFeetToSqM, cuFeetToCuM, formatNum } from "../utils/unitConversion.js";

export function registerGetMaterialQuantitiesTool(server: McpServer) {
  server.tool(
    "get_material_quantities",
    "Get material quantity takeoffs from the current Revit model. Returns material names, areas (m²), volumes (m³), and element counts. Can filter by categories or selected elements only. Useful for cost estimation, material scheduling, and quantity surveying.",
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
          const totalAreaM2 = formatNum(sqFeetToSqM(response.totalArea));
          const totalVolM3 = formatNum(cuFeetToCuM(response.totalVolume), 3);

          let resultText = `# Material Quantities\n\n`;
          resultText += `- Total Materials: ${response.totalMaterials}\n`;
          resultText += `- Total Area: ${totalAreaM2} m²\n`;
          resultText += `- Total Volume: ${totalVolM3} m³\n\n`;

          if (response.materials && response.materials.length > 0) {
            for (const mat of response.materials) {
              const areaM2 = formatNum(sqFeetToSqM(mat.area));
              const volM3 = formatNum(cuFeetToCuM(mat.volume), 3);
              resultText += `## ${mat.materialName}\n`;
              resultText += `- Class: ${mat.materialClass}\n`;
              resultText += `- Area: ${areaM2} m² | Volume: ${volM3} m³\n`;
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
