import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerGetDocumentSwitchedTool(server: McpServer) {
  server.tool(
    "get_document_switched",
    "Switch the active document context to a linked document, or return to the host document. Large projects often use linked models (Architecture links Structure, MEP, etc.). Without this tool, all queries only access the host document. Use documentTitle matching the exact linked file name. Pass null or empty string to return to the host document. Returns success/fail status and active document info.",
    {
      documentTitle: z
        .string()
        .optional()
        .describe(
          "The title/filename of the linked document to switch to (e.g., 'Structure.rvt', 'MEP.rvt'). Pass null or omit to return to the host document. The title must match exactly as it appears in Revit's Manage Links dialog."
        ),
    },
    async (args, extra) => {
      const params = {
        documentTitle: args.documentTitle ?? null,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "get_document_switched",
            params
          );
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
              text: `get_document_switched failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
