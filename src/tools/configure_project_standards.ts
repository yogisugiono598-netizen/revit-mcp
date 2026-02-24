import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

const TextSizesSchema = z.object({
  title: z.number().optional().describe("Title text size in mm (e.g., 5.0)"),
  heading: z
    .number()
    .optional()
    .describe("Heading text size in mm (e.g., 3.5)"),
  body: z.number().optional().describe("Body text size in mm (e.g., 2.5)"),
  note: z.number().optional().describe("Note/small text size in mm (e.g., 2.0)"),
});

const LineSegmentSchema = z.object({
  type: z
    .enum(["dash", "dot", "space"])
    .describe("Segment type: dash, dot, or space"),
  lengthMm: z.number().describe("Segment length in mm (0 for dot)"),
});

const LinePatternDefSchema = z.object({
  name: z.string().describe("Pattern name"),
  segments: z.array(LineSegmentSchema).describe("Pattern segments"),
});

const ConcreteGradeSchema = z.object({
  name: z
    .string()
    .describe(
      "Grade name (e.g., 'Beton fc\\' 30 MPa', 'Concrete C30/37', 'Concrete 4000 psi')"
    ),
  fcMPa: z.number().describe("Compressive strength in MPa"),
});

const SteelGradeSchema = z.object({
  name: z
    .string()
    .describe("Grade name (e.g., 'Baja BJ-41', 'Steel S355', 'Steel A992')"),
  fyMPa: z.number().describe("Yield strength in MPa"),
});

const RebarSizeSchema = z.object({
  designation: z
    .string()
    .describe("Rebar designation (e.g., 'D13', 'H16', '#5')"),
  diameterMm: z.number().describe("Bar diameter in mm"),
});

export function registerConfigureProjectStandardsTool(server: McpServer) {
  server.tool(
    "configure_project_standards",
    `Configure project standards for a national/regional building code. Apply a preset or customize individual settings.

PRESETS (apply all settings for a standard):
- SNI_Indonesia: Metric mm, SNI 2847/1729, Indonesian naming (Lantai 1, Lantai 2), rebar D10-D25, fc' 20-35 MPa
- British_Standard: Metric mm, BS EN/Eurocode, UK naming (Level 0, Level 1), rebar H8-H32, C20/25-C35/45
- US_ACI_AISC: Imperial ft-in, ACI 318/AISC 360, US naming (Level 1, Level 2), rebar #3-#10, 3000-5000 psi
- Eurocode: Metric mm, EC2/EC3, European naming, ISOCPEUR font, rebar H8-H32

CUSTOM OVERRIDE: Use a preset as base, then override specific settings. Example:
  preset="SNI_Indonesia", text={font:"ISOCPEUR"}, structural={rebarCovers:{columnMm:50}}
  → All SNI defaults + ISOCPEUR font + 50mm column cover

WHAT IT CONFIGURES:
- Units (length, area, volume, accuracy)
- Dimension types (text size, font, arrow style)
- Text types (font, sizes by role: title/heading/body/note, width factor)
- Line patterns (ISO 128 standard patterns)
- Structural (rebar covers, concrete grades, steel grades, rebar sizes as materials)
- Level naming (prefix + numbering)
- Project info (design standard, building codes, site location/timezone)`,
    {
      preset: z
        .enum([
          "SNI_Indonesia",
          "British_Standard",
          "US_ACI_AISC",
          "Eurocode",
          "Custom",
        ])
        .optional()
        .describe(
          "Preset standard to apply. All defaults from this preset are used unless overridden by explicit parameters below."
        ),
      units: z
        .object({
          lengthUnit: z
            .enum([
              "Millimeters",
              "Centimeters",
              "Meters",
              "Feet",
              "FractionalInches",
            ])
            .optional()
            .describe("Length display unit"),
          areaUnit: z
            .enum(["SquareMeters", "SquareFeet"])
            .optional()
            .describe("Area display unit"),
          volumeUnit: z
            .enum(["CubicMeters", "CubicFeet", "CubicYards"])
            .optional()
            .describe("Volume display unit"),
          lengthAccuracy: z
            .number()
            .optional()
            .describe(
              "Length accuracy (e.g., 1.0 for mm, 0.01 for cm, 0.0625 for 1/16 inch)"
            ),
        })
        .optional()
        .describe("Unit system configuration"),
      dimensions: z
        .object({
          textSizeMm: z
            .number()
            .optional()
            .describe("Dimension text size in mm (e.g., 2.5)"),
          font: z
            .string()
            .optional()
            .describe("Font name (e.g., 'Arial', 'ISOCPEUR')"),
          arrowStyle: z
            .enum(["ClosedFilled", "Open30", "TickMark", "Dot", "HeavyEndTick"])
            .optional()
            .describe("Dimension arrow/tick style"),
        })
        .optional()
        .describe("Dimension type settings (applied to ALL dimension types)"),
      text: z
        .object({
          font: z
            .string()
            .optional()
            .describe(
              "Font for all text types (e.g., 'Arial', 'ISOCPEUR', 'Romans')"
            ),
          sizes: TextSizesSchema.optional().describe(
            "Text sizes by role in mm. Types are auto-matched by name (title/heading/note keywords)."
          ),
          widthFactor: z
            .number()
            .optional()
            .describe("Text width factor (0.8-1.0, default 1.0)"),
        })
        .optional()
        .describe("Text note type settings"),
      lines: z
        .object({
          createISOPatterns: z
            .boolean()
            .optional()
            .describe(
              "Create standard ISO 128 line patterns (Dash, Dash-Dot, Dash-Dot-Dot, Long Dash Dot, Long Dash Short Dash)"
            ),
          patterns: z
            .array(LinePatternDefSchema)
            .optional()
            .describe("Custom line patterns to create"),
        })
        .optional()
        .describe("Line pattern configuration"),
      structural: z
        .object({
          rebarCovers: z
            .object({
              slabMm: z
                .number()
                .optional()
                .describe("Slab rebar cover in mm (SNI: 20, BS: 25, US: 19)"),
              beamMm: z
                .number()
                .optional()
                .describe("Beam rebar cover in mm (SNI: 30, BS: 35, US: 38)"),
              columnMm: z
                .number()
                .optional()
                .describe(
                  "Column rebar cover in mm (SNI: 40, BS: 40, US: 38)"
                ),
              foundationMm: z
                .number()
                .optional()
                .describe(
                  "Foundation rebar cover in mm (SNI: 50, BS: 50, US: 76)"
                ),
            })
            .optional()
            .describe("Rebar cover distances per element type"),
          concreteGrades: z
            .array(ConcreteGradeSchema)
            .optional()
            .describe("Concrete grade materials to create"),
          steelGrades: z
            .array(SteelGradeSchema)
            .optional()
            .describe("Steel grade materials to create"),
          rebarSizes: z
            .array(RebarSizeSchema)
            .optional()
            .describe("Rebar size materials to create for reference"),
        })
        .optional()
        .describe("Structural standards configuration"),
      naming: z
        .object({
          levelPrefix: z
            .string()
            .optional()
            .describe(
              "Level name prefix (e.g., 'Lantai', 'Level', 'Floor'). Existing levels will be renamed."
            ),
          levelStartNumber: z
            .number()
            .optional()
            .describe("Starting number for levels (0 or 1)"),
          gridXPattern: z
            .enum(["numeric", "alphabetic"])
            .optional()
            .describe("Grid naming pattern for X-direction"),
          gridYPattern: z
            .enum(["numeric", "alphabetic"])
            .optional()
            .describe("Grid naming pattern for Y-direction"),
        })
        .optional()
        .describe("Naming conventions for levels and grids"),
      projectInfo: z
        .object({
          designStandard: z
            .string()
            .optional()
            .describe("Design standard name (e.g., 'SNI', 'BS EN', 'ACI/AISC')"),
          concreteCode: z
            .string()
            .optional()
            .describe("Concrete code reference (e.g., 'SNI 2847:2019')"),
          steelCode: z
            .string()
            .optional()
            .describe("Steel code reference (e.g., 'SNI 1729:2020')"),
          country: z.string().optional().describe("Country name"),
          siteLatitude: z
            .number()
            .optional()
            .describe("Site latitude in degrees (e.g., -6.2088 for Jakarta)"),
          siteLongitude: z
            .number()
            .optional()
            .describe("Site longitude in degrees (e.g., 106.8456 for Jakarta)"),
          timeZone: z
            .number()
            .optional()
            .describe("Time zone offset from UTC (e.g., 7.0 for GMT+7)"),
        })
        .optional()
        .describe("Project information and site location"),
    },
    async (args, extra) => {
      const params: Record<string, unknown> = {};

      if (args.preset) params.preset = args.preset;
      if (args.units) params.units = args.units;
      if (args.dimensions) params.dimensions = args.dimensions;
      if (args.text) params.text = args.text;
      if (args.lines) params.lines = args.lines;
      if (args.structural) params.structural = args.structural;
      if (args.naming) params.naming = args.naming;
      if (args.projectInfo) params.projectInfo = args.projectInfo;

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand(
            "configure_project_standards",
            params
          );
        });

        if (response.success) {
          let resultText = `Project standards configured successfully!\n`;
          resultText += `Preset: ${response.preset}\n`;
          resultText += `Changes applied: ${response.changesApplied}\n\n`;

          if (response.changes && response.changes.length > 0) {
            resultText += "Changes:\n";
            for (const change of response.changes) {
              resultText += `  [OK] ${change}\n`;
            }
          }

          resultText += `\n${response.message}`;

          return { content: [{ type: "text", text: resultText }] };
        } else {
          let errorText = `Configuration failed: ${response.message}`;
          if (
            response.changesBeforeError &&
            response.changesBeforeError.length > 0
          ) {
            errorText += "\n\nChanges applied before error:\n";
            for (const change of response.changesBeforeError) {
              errorText += `  [OK] ${change}\n`;
            }
          }
          return { content: [{ type: "text", text: errorText }] };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Configuration failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
