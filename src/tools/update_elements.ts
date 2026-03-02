import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerUpdateElementsTool(server: McpServer) {
  server.tool(
    "update_elements",
    "Batch update element properties including type, level, and parameters. Supports setting multiple parameters per element in a single operation.",
    {
      elements: z
        .array(
          z.object({
            elementId: z
              .number()
              .int()
              .describe("Element ID to update"),
            typeId: z
              .number()
              .int()
              .optional()
              .describe("New type element ID to change the element's type"),
            levelId: z
              .number()
              .int()
              .optional()
              .describe("New level element ID to reassign the element's level"),
            parameters: z
              .array(
                z.object({
                  name: z
                    .string()
                    .describe("Parameter name (e.g., 'Comments', 'Mark', 'Top Offset')"),
                  value: z
                    .union([z.string(), z.number(), z.boolean()])
                    .describe("Parameter value. String, number, or boolean depending on parameter type"),
                })
              )
              .optional()
              .describe("Array of parameter name-value pairs to set on the element"),
          })
        )
        .describe("Array of element update definitions"),
      returnChanges: z
        .boolean()
        .optional()
        .default(true)
        .describe("Request that the C# plugin return before/after values for changed parameters. Default: true"),
    },
    async (args, extra) => {
      const finalParams = { ...args, returnChanges: true };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("update_elements", finalParams);
        });

        if (response.success && Array.isArray(response.results)) {
          let resultText = `# Update Results\n\n`;
          resultText += `- Success: ${response.success}\n`;
          resultText += `- Updated: ${response.updatedCount || response.results?.length || 0} elements\n\n`;
          if (response.results) {
            for (const result of response.results) {
              resultText += `## Element ${result.elementId}\n`;
              resultText += `- Status: ${result.success ? 'Updated' : 'Failed'}\n`;
              if (result.message) resultText += `- Message: ${result.message}\n`;
              if (result.changes && result.changes.length > 0) {
                for (const change of result.changes) {
                  resultText += `  - ${change.parameter}: ${change.oldValue} \u2192 ${change.newValue}\n`;
                }
              }
              resultText += `\n`;
            }
          }

          return {
            content: [
              {
                type: "text",
                text: resultText,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Update elements failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
