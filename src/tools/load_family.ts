import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerLoadFamilyTool(server: McpServer) {
  server.tool(
    "load_family",
    "Load .rfa family files into project. Solves template dependency issues by loading families from disk. Supports batch loading with optional overwrite.",
    {
      familyPaths: z
        .array(
          z.string().describe("Full file path to an .rfa family file (e.g., 'C:\\\\Families\\\\Chair.rfa')")
        )
        .describe("Array of full file paths to .rfa family files to load"),
      overwriteExisting: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, overwrites families that already exist in the project. Default: false"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("load_family", params);
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
              text: `Family loading failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
