import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerCreateLegendTool(server: McpServer) {
  server.tool(
    "create_legend",
    "Create legend view for material, symbol, or abbreviation reference. Legends can be placed on multiple sheets unlike regular views.",
    {
      name: z
        .string()
        .describe("Legend view name (e.g., 'Material Legend', 'Keterangan Simbol', 'Abbreviation Legend')"),
      scale: z
        .number()
        .int()
        .optional()
        .default(100)
        .describe("Legend view scale denominator (e.g., 100 for 1:100). Default: 100"),
      detailLevel: z
        .enum(["Coarse", "Medium", "Fine"])
        .optional()
        .default("Medium")
        .describe("Legend detail level: Coarse, Medium, or Fine. Default: Medium"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_legend", params);
        });

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
              text: `Legend creation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
