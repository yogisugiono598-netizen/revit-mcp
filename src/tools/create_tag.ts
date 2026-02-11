import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

const pointSchema = z.object({
  x: z.number().describe("X coordinate in mm"),
  y: z.number().describe("Y coordinate in mm"),
  z: z.number().describe("Z coordinate in mm"),
});

const tagInfoSchema = z.object({
  elementId: z
    .number()
    .int()
    .describe("Element ID of the element to tag"),
  tagCategory: z
    .string()
    .optional()
    .describe(
      "Tag category override. Auto-detected from element if not specified. Options: Wall, Door, Window, Room, Floor, Ceiling, Column, Beam, Furniture, Equipment, Pipe, Duct, Generic, Parking, Area, Space"
    ),
  location: pointSchema
    .optional()
    .describe(
      "Tag placement location in mm. If not specified, tag is placed at element midpoint/center"
    ),
  orientation: z
    .number()
    .int()
    .min(0)
    .max(1)
    .optional()
    .default(0)
    .describe("Tag orientation: 0 = horizontal (default), 1 = vertical"),
  hasLeader: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether the tag should have a leader line"),
  tagTypeId: z
    .number()
    .int()
    .optional()
    .describe(
      "Specific tag family type ID. If not provided, the default tag type for the category will be used"
    ),
  viewId: z
    .number()
    .int()
    .optional()
    .describe(
      "View ID to create the tag in. If not specified, uses the current active view"
    ),
});

export function registerCreateTagTool(server: McpServer) {
  server.tool(
    "create_tag",
    "Create tags for elements in the Revit model. Supports tagging any category: Walls, Doors, Windows, Rooms, Floors, Ceilings, Columns, Beams, Furniture, Equipment, Pipes, Ducts, and more. Auto-detects the appropriate tag type based on element category, or allows explicit tag type specification.",
    {
      tags: z
        .array(tagInfoSchema)
        .describe("Array of tag creation information objects"),
    },
    async (args, extra) => {
      const params = { tags: args.tags };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_tag", params);
        });

        if (response.success) {
          let resultText = `Successfully created ${response.totalCreated}/${response.totalRequested} tags.\n\n`;

          if (response.tags && response.tags.length > 0) {
            resultText += "Created Tags:\n";
            for (const tag of response.tags) {
              resultText += `- Tag ${tag.id}: ${tag.elementCategory} "${tag.elementName}" (Element ${tag.elementId})\n`;
            }
          }

          if (response.errors && response.errors.length > 0) {
            resultText += `\nErrors:\n`;
            for (const err of response.errors) {
              resultText += `- ${err}\n`;
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
                text: `Tag creation failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Tag creation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
