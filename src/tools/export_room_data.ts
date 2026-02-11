import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerExportRoomDataTool(server: McpServer) {
  server.tool(
    "export_room_data",
    "Export detailed room data from the current Revit model. Returns room names, numbers, areas, volumes, perimeters, levels, departments, and other properties. Useful for room schedules, area analysis, and space planning.",
    {
      includeUnplacedRooms: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Whether to include unplaced rooms (rooms not yet placed in the model)"
        ),
      includeNotEnclosedRooms: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Whether to include not enclosed rooms (rooms without complete boundaries)"
        ),
    },
    async (args, extra) => {
      const params = {
        includeUnplacedRooms: args.includeUnplacedRooms ?? false,
        includeNotEnclosedRooms: args.includeNotEnclosedRooms ?? false,
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("export_room_data", params);
        });

        if (response.success) {
          let resultText = `# Room Data Export\n\n`;
          resultText += `- Total Rooms: ${response.totalRooms}\n`;
          resultText += `- Total Area: ${response.totalArea} sq ft\n\n`;

          if (response.rooms && response.rooms.length > 0) {
            for (const room of response.rooms) {
              resultText += `## ${room.name} (${room.number})\n`;
              resultText += `- ID: ${room.id} | Level: ${room.level}\n`;
              resultText += `- Area: ${room.area} sq ft | Volume: ${room.volume} cu ft\n`;
              resultText += `- Perimeter: ${room.perimeter} ft | Height: ${room.unboundedHeight} ft\n`;
              if (room.department) resultText += `- Department: ${room.department}\n`;
              if (room.phase) resultText += `- Phase: ${room.phase}\n`;
              if (room.comments) resultText += `- Comments: ${room.comments}\n`;
              resultText += `\n`;
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
                text: `Room data export failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Room data export failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
