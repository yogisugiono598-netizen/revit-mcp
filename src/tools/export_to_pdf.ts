import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerExportToPdfTool(server: McpServer) {
  server.tool(
    "export_to_pdf",
    "Batch export sheets to PDF. Final deliverable pipeline for printing and submission. Supports custom naming patterns, color modes, and combined output.",
    {
      sheetIds: z
        .array(z.number().int().describe("Sheet element ID to export"))
        .optional()
        .default([])
        .describe("Array of sheet element IDs to export. Leave empty to export all sheets"),
      outputFolder: z
        .string()
        .describe("Output folder path for PDF files (e.g., 'D:\\\\Output\\\\PDFs')"),
      fileNamingPattern: z
        .string()
        .optional()
        .default("{sheetNumber}_{sheetName}")
        .describe("File naming pattern using tokens: {sheetNumber}, {sheetName}, {projectName}, {date}. Default: '{sheetNumber}_{sheetName}'"),
      colorMode: z
        .enum(["Color", "GrayScale", "BlackLine"])
        .optional()
        .default("BlackLine")
        .describe("PDF color mode: Color, GrayScale, or BlackLine. Default: BlackLine"),
      resolution: z
        .number()
        .int()
        .optional()
        .default(300)
        .describe("PDF resolution in DPI. Default: 300"),
      combine: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, combines all sheets into a single PDF file. Default: false"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("export_to_pdf", params);
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
              text: `PDF export failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
