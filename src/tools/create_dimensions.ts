import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerCreateDimensionsTool(server: McpServer) {
  server.tool(
    "create_dimensions",
    "Create dimension annotations in the current Revit view. Supports Linear (between 2 points/elements), Angular (between 2 lines), Radial/Diameter (on arcs/circles), chain dimensions (multiple points in sequence), and text override. All coordinate units are in millimeters (mm).",
    {
      dimensions: z
        .array(
          z.object({
            dimensionType: z
              .enum(["Linear", "Angular", "Radial", "ArcLength", "Diameter"])
              .optional()
              .default("Linear")
              .describe(
                "Type of dimension to create. " +
                "Linear — between two points or element faces. " +
                "Angular — angle between two lines (requires 2 elementIds of line-based elements). " +
                "Radial — radius of an arc/circle (requires 1 elementId of arc/circle element). " +
                "Diameter — diameter of an arc/circle (requires 1 elementId of arc/circle element). " +
                "ArcLength — length along an arc (requires 1 elementId of arc element)."
              ),
            startPoint: z
              .object({
                x: z.number().describe("X coordinate in mm"),
                y: z.number().describe("Y coordinate in mm"),
                z: z.number().describe("Z coordinate in mm"),
              })
              .optional()
              .describe("Start point of the dimension reference (for Linear type)"),
            endPoint: z
              .object({
                x: z.number().describe("X coordinate in mm"),
                y: z.number().describe("Y coordinate in mm"),
                z: z.number().describe("Z coordinate in mm"),
              })
              .optional()
              .describe("End point of the dimension reference (for Linear type)"),
            linePoint: z
              .object({
                x: z.number().describe("X coordinate in mm"),
                y: z.number().describe("Y coordinate in mm"),
                z: z.number().describe("Z coordinate in mm"),
              })
              .optional()
              .describe("Location of the dimension line itself (offset from measured points). Determines where the dimension text appears"),
            elementIds: z
              .array(z.number().int())
              .optional()
              .describe(
                "Element IDs to dimension. " +
                "Linear: 2 elements (walls, columns, grids) to measure between. " +
                "Angular: 2 line-based elements to measure angle between. " +
                "Radial/Diameter/ArcLength: 1 arc or circle element."
              ),
            chainPoints: z
              .array(
                z.object({
                  x: z.number().describe("X coordinate in mm"),
                  y: z.number().describe("Y coordinate in mm"),
                  z: z.number().describe("Z coordinate in mm"),
                })
              )
              .optional()
              .describe("Array of points for chain dimensions (3+ points). Creates a continuous dimension string measuring between each consecutive pair of points. More efficient than creating multiple individual Linear dimensions"),
            dimensionStyleId: z
              .number()
              .int()
              .optional()
              .default(-1)
              .describe("ID of the dimension style/type to use (-1 for default)"),
            viewId: z
              .number()
              .int()
              .optional()
              .default(-1)
              .describe("View ID to create dimension in (-1 for active view)"),
            textOverride: z
              .string()
              .optional()
              .describe("Override the dimension text with a custom string (e.g., 'TYP.', 'EQ', or any label)"),
          })
        )
        .describe("Array of dimensions to create"),
    },
    async (args, extra) => {
      const params = args;
      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("create_dimensions", params);
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
              text: `Dimension creation failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
