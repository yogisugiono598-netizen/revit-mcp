import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetAllWarningsInTheModelTool(server: McpServer) {
  server.tool(
    "get_all_warnings_in_the_model",
    "Get all warnings in the current Revit model for QC automation. Returns warning descriptions, severity levels, and affected element IDs. Useful for detecting overlapping walls, unenclosed rooms, missing hosts, and other model issues before submittal or coordination.",
    {
      severityFilter: z
        .enum(["All", "Warning", "Error"])
        .optional()
        .default("All")
        .describe("Filter warnings by severity: All, Warning, or Error"),
      includeElementIds: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Whether to include failing and additional element IDs in the response"
        ),
    },
    async (args, extra) => {
      const params = {
        severityFilter: args.severityFilter || "All",
        includeElementIds: args.includeElementIds ?? true,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_all_warnings_in_the_model",
            params
          );
        });

        if (response.success) {
          let resultText = `# Model Warnings Report\n\n`;
          resultText += `- Total Warnings: ${response.totalWarnings}\n`;

          if (response.byCategory && response.byCategory.length > 0) {
            resultText += `\n## Summary by Type\n`;
            for (const cat of response.byCategory) {
              resultText += `- ${cat.description}: ${cat.count} occurrence(s)\n`;
            }
          }

          if (response.warnings && response.warnings.length > 0) {
            resultText += `\n## Warning Details\n`;
            for (const w of response.warnings) {
              resultText += `\n### ${w.severity}: ${w.description}\n`;
              if (w.failingElements && w.failingElements.length > 0) {
                resultText += `- Failing Elements: ${w.failingElements.join(", ")}\n`;
              }
              if (w.additionalElements && w.additionalElements.length > 0) {
                resultText += `- Additional Elements: ${w.additionalElements.join(", ")}\n`;
              }
            }
          }

          return { content: [{ type: "text", text: resultText }] };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Warning retrieval failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Warning retrieval failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
