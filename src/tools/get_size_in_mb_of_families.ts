import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetSizeInMbOfFamiliesTool(server: McpServer) {
  server.tool(
    "get_size_in_mb_of_families",
    "Get family file sizes and metadata for all loaded families in the model. Identifies heavy families that bloat file size and impact model performance. Returns family name, category, file size in MB, instance count, and type count. Sorted by size descending.",
    {
      calculateFileSizes: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Whether to calculate actual .rfa file sizes by exporting families. Set to false for faster metadata-only results (name, category, instance/type count)"
        ),
      maxFamilies: z
        .number()
        .int()
        .optional()
        .default(50)
        .describe(
          "Maximum number of families to calculate file sizes for (to limit processing time). Default: 50"
        ),
      sortBy: z
        .enum(["size", "instances", "types"])
        .optional()
        .default("size")
        .describe(
          "Sort results by: size (file size), instances (instance count), or types (type count)"
        ),
    },
    async (args, extra) => {
      const params = {
        calculateFileSizes: args.calculateFileSizes ?? true,
        maxFamilies: args.maxFamilies || 50,
        sortBy: args.sortBy || "size",
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_size_in_mb_of_families",
            params
          );
        });

        if (response.success) {
          let resultText = `# Family Size Report\n\n`;
          resultText += `- Total Families: ${response.totalFamilies}\n`;
          if (response.totalSizeMb !== undefined) {
            resultText += `- Total Size: ${response.totalSizeMb} MB\n`;
          }

          if (response.families && response.families.length > 0) {
            resultText += `\n## Families (sorted by ${params.sortBy})\n`;
            for (const fam of response.families) {
              const sizeStr =
                fam.sizeInMb >= 0 ? `${fam.sizeInMb} MB` : "N/A";
              resultText += `- **${fam.familyName}** (${fam.category}): ${sizeStr}, ${fam.instanceCount} instances, ${fam.typeCount} types\n`;
            }
          }

          if (response.errors && response.errors.length > 0) {
            resultText += `\n## Skipped (${response.errors.length})\n`;
            for (const err of response.errors) {
              resultText += `- ${err}\n`;
            }
          }

          return { content: [{ type: "text", text: resultText }] };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Family size query failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Family size query failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
