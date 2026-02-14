import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

const LayerSchema = z.object({
  function: z
    .enum([
      "Structure",
      "Substrate",
      "Insulation",
      "Finish1",
      "Finish2",
      "Membrane",
      "StructuralDeck",
    ])
    .describe(
      "Layer function: Structure (core structural layer), Substrate (sub-layer), Insulation (thermal layer), Finish1 (exterior finish), Finish2 (interior finish), Membrane (vapor barrier), StructuralDeck"
    ),
  materialName: z
    .string()
    .describe(
      "Material name for this layer. Must match an existing material or will be auto-created with default properties. Use create_material first for proper colors/patterns."
    ),
  widthMm: z
    .number()
    .positive()
    .describe("Layer thickness in millimeters (e.g., 15 for plaster, 120 for brick, 150 for concrete)"),
});

const ParameterSchema = z.object({
  name: z
    .string()
    .describe(
      "Parameter name (e.g., 'b' for width, 'h' for height, 'Width', 'Depth')"
    ),
  value: z
    .union([z.string(), z.number()])
    .describe(
      "Parameter value. For dimensions, use millimeters (auto-converted to feet internally). e.g., 400 for 400mm"
    ),
});

export function registerCreateElementTypeTool(server: McpServer) {
  server.tool(
    "create_element_type",
    `Create a new element type in Revit by duplicating an existing type and customizing it. Supports:

COMPOUND TYPES (wall, floor, roof, ceiling):
- Duplicates a base type and replaces its layer structure
- Each layer has: function (Structure/Finish1/Finish2/etc), material name, width in mm
- Materials are looked up by name; auto-created if not found (use create_material first for proper setup)
- Example: wall with 3 layers = Plester 15mm + Bata 120mm + Plester 15mm = 150mm total

FAMILY TYPES (column, beam):
- Duplicates an existing family type and sets dimension parameters
- Common params: 'b' (width), 'h' (height/depth) in millimeters
- Requires the base family to already be loaded in the model

TYPICAL INDONESIAN CONSTRUCTION:
- Dinding Bata 15cm: Finish1:Plester:15 + Structure:Bata:120 + Finish2:Plester:15
- Dinding Partisi 10cm: Finish1:Plester:10 + Structure:Bata:80 + Finish2:Plester:10
- Plat Lantai 12cm: Finish1:Keramik:10 + Substrate:Spesi:20 + Structure:Beton:120
- Kolom 40x60: parameters [{name:'b',value:400},{name:'h',value:600}]`,
    {
      category: z
        .enum(["wall", "floor", "roof", "ceiling", "column", "beam"])
        .describe(
          "Element category. wall/floor/roof/ceiling use compound layers. column/beam use family parameters."
        ),
      name: z
        .string()
        .describe(
          "Name for the new type (e.g., 'Dinding Bata 15cm', 'Plat Lantai 12cm', 'K 40x60')"
        ),
      baseTypeName: z
        .string()
        .optional()
        .describe(
          "Name of existing type to duplicate from. If omitted, the first available type of that category is used. For column/beam, you can use 'FamilyName: TypeName' format."
        ),
      layers: z
        .array(LayerSchema)
        .optional()
        .describe(
          "Layer composition for compound types (wall/floor/roof/ceiling). Order: exterior-to-interior for walls, top-to-bottom for floors/roofs. Each layer needs function, materialName, widthMm."
        ),
      parameters: z
        .array(ParameterSchema)
        .optional()
        .describe(
          "Parameter values for family types (column/beam). Common: [{name:'b',value:400},{name:'h',value:600}]. Values in mm for length parameters."
        ),
    },
    async (args, extra) => {
      const params: Record<string, unknown> = {
        category: args.category,
        name: args.name,
      };

      if (args.baseTypeName) params.baseTypeName = args.baseTypeName;
      if (args.layers) params.layers = args.layers;
      if (args.parameters) params.parameters = args.parameters;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "create_element_type",
            params
          );
        });

        if (response.success) {
          let resultText = `${response.category} type '${response.typeName}' created successfully!\n`;
          resultText += `Type ID: ${response.typeId}\n`;

          if (response.familyName) {
            resultText += `Family: ${response.familyName}\n`;
          }

          if (response.totalThicknessMm !== undefined) {
            resultText += `Total thickness: ${response.totalThicknessMm}mm\n`;
          }

          if (response.layers && response.layers.length > 0) {
            resultText += `\nLayers (${response.layerCount}):\n`;
            for (const layer of response.layers) {
              resultText += `  ${layer.function}: ${layer.material} (${layer.widthMm}mm)\n`;
            }
          }

          // Show parameter warning prominently
          if (response.hasParameterWarning) {
            resultText += `\n*** WARNING: Some parameters were NOT set! ***\n`;
            resultText += `The base family '${response.familyName}' may not have the expected parameter names.\n`;
            resultText += `Type was created but dimensions may be incorrect.\n`;
          }

          if (
            response.parameterResults &&
            response.parameterResults.length > 0
          ) {
            resultText += `\nParameter results:\n`;
            for (const pr of response.parameterResults) {
              const icon = pr.status === "set" ? "[OK]" : "[FAILED]";
              resultText += `  ${icon} ${pr.name}: ${pr.status}\n`;
            }
          }

          if (
            response.availableParameters &&
            response.availableParameters.length > 0
          ) {
            resultText += `\nAvailable writable parameters on this family:\n`;
            for (const ap of response.availableParameters) {
              resultText += `  - ${ap.name} (${ap.storageType})\n`;
            }
          }

          resultText += `\n${response.message}`;

          return { content: [{ type: "text", text: resultText }] };
        } else {
          let errorText = `Type creation failed: ${response.message}`;
          if (response.existingTypeId) {
            errorText += `\nExisting type ID: ${response.existingTypeId}`;
          }

          // Show available families when param failure caused rollback
          if (response.availableFamilies && response.availableFamilies.length > 0) {
            errorText += `\n\nAvailable families in the model:\n`;
            for (const fam of response.availableFamilies) {
              errorText += `\n  Family: ${fam.familyName}\n`;
              errorText += `    Types: ${fam.types.join(", ")}\n`;
              if (fam.sampleParams && fam.sampleParams.length > 0) {
                errorText += `    Writable dimension params: ${fam.sampleParams.join(", ")}\n`;
              }
            }
            errorText += `\nUse baseTypeName to specify the correct family/type, and use the correct parameter names.`;
          }

          return { content: [{ type: "text", text: errorText }] };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Type creation failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
