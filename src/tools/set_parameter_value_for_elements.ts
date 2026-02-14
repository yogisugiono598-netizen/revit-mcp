import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerSetParameterValueForElementsTool(server: McpServer) {
  server.tool(
    "set_parameter_value_for_elements",
    "Set parameter values for multiple elements in bulk. Supports setting the same value for all elements or different values per element. Handles String, Integer, Double, and ElementId parameter types automatically. Essential for BIM coordination workflows (COBie, clash detection prep).",
    {
      parameterName: z
        .string()
        .describe(
          "The name of the parameter to set (e.g., 'Mark', 'Comments', 'Fire Rating')"
        ),
      elementIds: z
        .array(z.number().int())
        .describe("Array of element IDs to modify"),
      values: z
        .array(z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe(
          "Array of values corresponding to each elementId. Must match elementIds length. If not provided, uses 'value' for all elements"
        ),
      value: z
        .union([z.string(), z.number(), z.boolean()])
        .optional()
        .describe(
          "Single value to apply to all elements. Used when 'values' array is not provided"
        ),
    },
    async (args, extra) => {
      const params = {
        parameterName: args.parameterName,
        elementIds: args.elementIds,
        values: args.values || null,
        value: args.value ?? null,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "set_parameter_value_for_elements",
            params
          );
        });

        if (response.success) {
          let resultText = `Successfully updated parameter "${args.parameterName}" on ${response.updatedCount}/${response.totalCount} elements.\n`;

          if (response.skipped && response.skipped.length > 0) {
            resultText += `\nSkipped ${response.skipped.length} elements:\n`;
            for (const skip of response.skipped) {
              resultText += `- Element ${skip.elementId}: ${skip.reason}\n`;
            }
          }

          return { content: [{ type: "text", text: resultText }] };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Bulk parameter update failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Bulk parameter update failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
