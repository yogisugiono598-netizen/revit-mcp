import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetMaterialLayersFromTypesTool(server: McpServer) {
  server.tool(
    "get_material_layers_from_types",
    "Get the material layer composition of compound element types (Walls, Floors, Roofs, Ceilings). Returns the layer sequence with material name, thickness in mm, and layer function. Useful for construction documentation, SNI compliance checks, fire rating verification, and specification review.",
    {
      typeIds: z
        .array(z.number().int())
        .describe(
          "Array of element type IDs to query material layers for. These should be type IDs (not instance IDs) for Walls, Floors, Roofs, or Ceilings"
        ),
    },
    async (args, extra) => {
      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_material_layers_from_types",
            { typeIds: args.typeIds }
          );
        });

        if (response.success) {
          let resultText = `# Material Layers Report\n\n`;
          resultText += `Queried ${response.types.length} type(s).\n`;

          for (const type of response.types) {
            resultText += `\n## ${type.typeName} (${type.category})\n`;
            resultText += `- Total Thickness: ${type.totalThickness} mm\n`;

            if (type.layers && type.layers.length > 0) {
              resultText += `- Layers (exterior to interior):\n`;
              for (let i = 0; i < type.layers.length; i++) {
                const layer = type.layers[i];
                resultText += `  ${i + 1}. **${layer.function}**: ${layer.materialName} — ${layer.thickness} mm\n`;
              }
            } else {
              resultText += `- No compound structure (basic type)\n`;
            }
          }

          return { content: [{ type: "text", text: resultText }] };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Material layer query failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Material layer query failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
