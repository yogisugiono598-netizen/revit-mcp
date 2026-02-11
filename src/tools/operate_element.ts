import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerOperateElementTool(server: McpServer) {
  server.tool(
    "operate_element",
    "Operate on Revit elements by performing actions such as select, move, rotate, copy, delete, hide, setParameter, rename, and more.",
    {
      data: z
        .object({
          elementIds: z
            .array(z
              .number()
              .describe("A valid Revit element ID to operate on")
            )
            .describe("Array of Revit element IDs to perform the specified action on"),
          action: z
            .string()
            .describe(
              "The operation to perform on elements. Valid values: " +
              "Select, SelectionBox, SetColor, SetTransparency, Delete, Hide, TempHide, Isolate, Unhide, ResetIsolate, Highlight, " +
              "Move, Rotate, Copy, Mirror, SetParameter, Rename. " +
              "Select — select elements in active view. " +
              "SelectionBox — select elements by drawing a rectangular window. " +
              "SetColor — change element color (requires colorValue). " +
              "SetTransparency — adjust transparency (requires transparencyValue). " +
              "Highlight — set elements to red color. " +
              "Delete — permanently remove elements. " +
              "Hide — hide elements in current view. " +
              "TempHide — temporarily hide elements. " +
              "Isolate — show only selected elements. " +
              "Unhide — reveal hidden elements. " +
              "ResetIsolate — restore normal visibility. " +
              "Move — move elements by translation vector (requires moveVector). " +
              "Rotate — rotate elements around a point (requires rotationCenter, rotationAngle). " +
              "Copy — copy elements by translation vector (requires moveVector). " +
              "Mirror — mirror elements across a plane (requires mirrorPlaneOrigin, mirrorPlaneNormal). " +
              "SetParameter — set a parameter value on elements (requires parameterName, parameterValue). " +
              "Rename — rename elements like grids, levels, etc (requires newName)."
            ),
          transparencyValue: z
            .number()
            .default(50)
            .describe("Transparency value (0-100) for SetTransparency action."),
          colorValue: z
            .array(z.number())
            .default([255, 0, 0])
            .describe("RGB color values for SetColor action. Default is red [255,0,0]."),
          moveVector: z
            .object({
              x: z.number().describe("X translation in mm"),
              y: z.number().describe("Y translation in mm"),
              z: z.number().describe("Z translation in mm"),
            })
            .optional()
            .describe("Translation vector for Move and Copy actions, in millimeters"),
          rotationCenter: z
            .object({
              x: z.number().describe("X coordinate in mm"),
              y: z.number().describe("Y coordinate in mm"),
              z: z.number().describe("Z coordinate in mm"),
            })
            .optional()
            .describe("Center point of rotation for Rotate action, in millimeters"),
          rotationAngle: z
            .number()
            .optional()
            .describe("Rotation angle in degrees (positive = counter-clockwise) for Rotate action"),
          mirrorPlaneOrigin: z
            .object({
              x: z.number().describe("X coordinate in mm"),
              y: z.number().describe("Y coordinate in mm"),
              z: z.number().describe("Z coordinate in mm"),
            })
            .optional()
            .describe("Origin point of the mirror plane for Mirror action, in millimeters"),
          mirrorPlaneNormal: z
            .object({
              x: z.number().describe("X direction component"),
              y: z.number().describe("Y direction component"),
              z: z.number().describe("Z direction component"),
            })
            .optional()
            .describe("Normal vector of the mirror plane for Mirror action (e.g., {x:1,y:0,z:0} for YZ plane)"),
          parameterName: z
            .string()
            .optional()
            .describe("Name of the parameter to set for SetParameter action (e.g., 'Comments', 'Mark')"),
          parameterValue: z
            .union([z.string(), z.number(), z.boolean()])
            .optional()
            .describe("Value to set for SetParameter action. Can be string, number, or boolean"),
          newName: z
            .string()
            .optional()
            .describe("New name for Rename action. Works on Grids, Levels, Views, etc."),
          copyCount: z
            .number()
            .int()
            .min(1)
            .optional()
            .default(1)
            .describe("Number of copies for Copy action. Default is 1"),
        })
        .describe("Parameters for operating on Revit elements with specific actions"),
    },
    async (args, extra) => {
      const params = args;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("operate_element", params);
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
              text: `Operate elements failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
