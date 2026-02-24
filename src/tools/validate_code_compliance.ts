import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerValidateCodeComplianceTool(server: McpServer) {
  server.tool(
    "validate_code_compliance",
    "Auto-check model against building codes. SNI Indonesian standards built-in. Validates stairs, corridors, doors, rooms, and fire escape routes against selected standard.",
    {
      checks: z
        .array(
          z.enum(["stairs", "corridors", "doors", "rooms", "fire_escape"])
            .describe("Code compliance check category")
        )
        .describe("Array of compliance check categories to validate: stairs (riser/tread), corridors (min width), doors (min width/swing), rooms (min area), fire_escape (travel distance)"),
      standard: z
        .enum(["SNI", "IBC", "BS"])
        .optional()
        .default("SNI")
        .describe("Building code standard to validate against: SNI (Indonesian), IBC (International Building Code), BS (British Standard). Default: SNI"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("validate_code_compliance", params);
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
              text: `Code compliance validation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
