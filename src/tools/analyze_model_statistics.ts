import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerAnalyzeModelStatisticsTool(server: McpServer) {
  server.tool(
    "analyze_model_statistics",
    "Analyze the current Revit model and return comprehensive statistics including element counts by category, type counts, family counts, level information, view/sheet counts, and project summary. Useful for understanding model complexity and composition.",
    {
      includeDetailedTypes: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Whether to include detailed type breakdown per category (type name, family name, instance count). Set to false for a lighter summary."
        ),
    },
    async (args, extra) => {
      const params = {
        includeDetailedTypes: args.includeDetailedTypes ?? true,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "analyze_model_statistics",
            params
          );
        });

        if (response.success) {
          let resultText = `# Model Statistics: ${response.projectName}\n\n`;
          resultText += `- Total Elements: ${response.totalElements}\n`;
          resultText += `- Total Types: ${response.totalTypes}\n`;
          resultText += `- Total Families: ${response.totalFamilies}\n`;
          resultText += `- Total Views: ${response.totalViews}\n`;
          resultText += `- Total Sheets: ${response.totalSheets}\n\n`;

          if (response.categories && response.categories.length > 0) {
            resultText += `## Categories (${response.categories.length})\n`;
            for (const cat of response.categories) {
              resultText += `\n### ${cat.categoryName}\n`;
              resultText += `- Elements: ${cat.elementCount}, Types: ${cat.typeCount}, Families: ${cat.familyCount}\n`;

              if (
                params.includeDetailedTypes &&
                cat.types &&
                cat.types.length > 0
              ) {
                for (const t of cat.types) {
                  resultText += `  - ${t.familyName}: ${t.typeName} (${t.instanceCount} instances)\n`;
                }
              }
            }
          }

          if (response.levels && response.levels.length > 0) {
            resultText += `\n## Levels (${response.levels.length})\n`;
            for (const lvl of response.levels) {
              resultText += `- ${lvl.levelName}: elevation ${lvl.elevation}mm, ${lvl.elementCount} elements\n`;
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
                text: `Analysis failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Model statistics analysis failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
