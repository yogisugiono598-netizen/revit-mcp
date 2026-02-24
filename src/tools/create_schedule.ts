import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerCreateScheduleTool(server: McpServer) {
  server.tool(
    "create_schedule",
    "Create schedules for BOQ automation. Supports door, window, room, material schedules and more. Configurable fields, filters, and sorting for complete schedule definitions.",
    {
      name: z
        .string()
        .describe("Schedule name (e.g., 'Door Schedule', 'Jadwal Pintu', 'Room Finish Schedule')"),
      categoryName: z
        .string()
        .describe("Revit category name to schedule (e.g., 'Doors', 'Windows', 'Rooms', 'Walls', 'Floors', 'Furniture')"),
      type: z
        .enum(["Regular", "KeySchedule", "MaterialTakeoff"])
        .optional()
        .default("Regular")
        .describe("Schedule type: Regular (instance schedule), KeySchedule (key-based), MaterialTakeoff (material quantities). Default: Regular"),
      fields: z
        .array(
          z.object({
            parameterName: z
              .string()
              .describe("Parameter name to include as a column (e.g., 'Type Name', 'Width', 'Height', 'Area')"),
            heading: z
              .string()
              .optional()
              .describe("Custom column heading. If not provided, uses the parameter name"),
            isHidden: z
              .boolean()
              .optional()
              .default(false)
              .describe("Whether the field is hidden (used for filtering/sorting but not displayed). Default: false"),
          })
        )
        .describe("Array of field definitions for the schedule columns"),
      filters: z
        .array(
          z.object({
            fieldName: z
              .string()
              .describe("Field name to filter on (must match a field's parameterName)"),
            filterType: z
              .string()
              .describe("Filter type: Equal, NotEqual, GreaterThan, LessThan, GreaterOrEqual, LessOrEqual, Contains, NotContains, BeginsWith, EndsWith"),
            filterValue: z
              .string()
              .describe("Value to filter against"),
          })
        )
        .optional()
        .describe("Array of filter definitions to limit schedule data"),
      sortFields: z
        .array(
          z.object({
            fieldName: z
              .string()
              .describe("Field name to sort by (must match a field's parameterName)"),
            sortOrder: z
              .string()
              .optional()
              .default("Ascending")
              .describe("Sort order: Ascending or Descending. Default: Ascending"),
          })
        )
        .optional()
        .describe("Array of sort field definitions for ordering schedule rows"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_schedule", params);
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
              text: `Schedule creation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
