// ============================================================
// CreateDimensionsExtensions.cs
// Reference C# code for enhanced create_dimensions handler
// Supports: Linear, Angular, Radial, Diameter, ArcLength,
//           Chain dimensions, and text override
// ============================================================
// Unit convention: MCP sends millimeters, Revit API uses feet.
// Conversion: 1 foot = 304.8 mm
// ============================================================

using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;

namespace RevitMcp.Handlers
{
    public static class CreateDimensionsExtensions
    {
        private const double MmToFeet = 1.0 / 304.8;

        private static XYZ ParseXYZ(JObject obj)
        {
            double x = obj.Value<double>("x") * MmToFeet;
            double y = obj.Value<double>("y") * MmToFeet;
            double z = obj.Value<double>("z") * MmToFeet;
            return new XYZ(x, y, z);
        }

        /// <summary>
        /// Main handler for create_dimensions command.
        /// Dispatches to specific handlers based on dimensionType.
        /// </summary>
        public static object HandleCreateDimensions(Document doc, UIDocument uidoc, JObject data)
        {
            JArray dimensionsArray = data["dimensions"] as JArray;
            if (dimensionsArray == null || dimensionsArray.Count == 0)
                throw new ArgumentException("No dimensions provided");

            var results = new List<object>();

            using (Transaction tx = new Transaction(doc, "MCP Create Dimensions"))
            {
                tx.Start();

                foreach (JObject dimObj in dimensionsArray)
                {
                    try
                    {
                        string dimType = dimObj.Value<string>("dimensionType") ?? "Linear";
                        int viewIdValue = dimObj.Value<int?>("viewId") ?? -1;
                        View view = viewIdValue == -1
                            ? doc.ActiveView
                            : doc.GetElement(new ElementId(viewIdValue)) as View;

                        if (view == null)
                            throw new ArgumentException("Invalid view");

                        Dimension createdDim = null;

                        switch (dimType)
                        {
                            case "Linear":
                                // Check if chain dimensions
                                JArray chainPoints = dimObj["chainPoints"] as JArray;
                                if (chainPoints != null && chainPoints.Count >= 3)
                                {
                                    createdDim = CreateChainDimension(doc, view, dimObj, chainPoints);
                                }
                                else
                                {
                                    createdDim = CreateLinearDimension(doc, view, dimObj);
                                }
                                break;

                            case "Angular":
                                createdDim = CreateAngularDimension(doc, view, dimObj);
                                break;

                            case "Radial":
                            case "Diameter":
                            case "ArcLength":
                                createdDim = CreateRadialDimension(doc, view, dimObj, dimType);
                                break;
                        }

                        // Apply text override if provided
                        if (createdDim != null)
                        {
                            string textOverride = dimObj.Value<string>("textOverride");
                            if (!string.IsNullOrEmpty(textOverride))
                            {
                                // For single-segment dimensions
                                if (createdDim.NumberOfSegments == 0)
                                {
                                    createdDim.ValueOverride = textOverride;
                                }
                                else
                                {
                                    // For multi-segment (chain) — override all segments
                                    foreach (DimensionSegment seg in createdDim.Segments)
                                    {
                                        seg.ValueOverride = textOverride;
                                    }
                                }
                            }

                            results.Add(new
                            {
                                success = true,
                                dimensionId = createdDim.Id.IntegerValue,
                                dimensionType = dimType,
                                textOverride = dimObj.Value<string>("textOverride")
                            });
                        }
                    }
                    catch (Exception ex)
                    {
                        results.Add(new
                        {
                            success = false,
                            error = ex.Message,
                            dimensionType = dimObj.Value<string>("dimensionType") ?? "Linear"
                        });
                    }
                }

                tx.Commit();
            }

            return new
            {
                success = true,
                message = $"Created {results.Count(r => ((dynamic)r).success)} dimension(s)",
                results = results
            };
        }

        // =============================================
        // LINEAR DIMENSION (between 2 points or elements)
        // =============================================
        private static Dimension CreateLinearDimension(Document doc, View view, JObject dimObj)
        {
            JArray elementIdsArr = dimObj["elementIds"] as JArray;

            if (elementIdsArr != null && elementIdsArr.Count >= 2)
            {
                // Dimension between elements
                ReferenceArray refArray = new ReferenceArray();
                foreach (int elemId in elementIdsArr.Take(2))
                {
                    Element elem = doc.GetElement(new ElementId(elemId));
                    if (elem == null) throw new ArgumentException($"Element {elemId} not found");

                    // Get reference from element geometry
                    Reference elemRef = GetElementReference(elem);
                    if (elemRef != null) refArray.Append(elemRef);
                }

                if (refArray.Size < 2)
                    throw new ArgumentException("Could not get references from elements");

                Line dimLine = GetDimensionLine(dimObj, refArray);
                return doc.Create.NewDimension(view, dimLine, refArray);
            }
            else
            {
                // Dimension between points
                JObject startPt = dimObj["startPoint"] as JObject;
                JObject endPt = dimObj["endPoint"] as JObject;
                if (startPt == null || endPt == null)
                    throw new ArgumentException("Linear dimension requires startPoint and endPoint, or 2 elementIds");

                XYZ start = ParseXYZ(startPt);
                XYZ end = ParseXYZ(endPt);

                // Create reference planes at start and end
                // Then dimension between them
                Line dimLine = Line.CreateBound(start, end);

                JObject linePt = dimObj["linePoint"] as JObject;
                if (linePt != null)
                {
                    XYZ linePoint = ParseXYZ(linePt);
                    XYZ direction = (end - start).Normalize();
                    XYZ offset = linePoint - start;
                    dimLine = Line.CreateBound(
                        start + offset - direction * 0.5,
                        end + offset + direction * 0.5
                    );
                }

                // For point-based dims, we need to create detail lines or use references
                // This is a simplified approach — full implementation depends on project setup
                ReferenceArray refArray = new ReferenceArray();
                // Add references at start and end points
                // (actual implementation needs reference from nearest elements)

                return doc.Create.NewDimension(view, dimLine, refArray);
            }
        }

        // =============================================
        // CHAIN DIMENSION (multiple points in sequence)
        // =============================================
        private static Dimension CreateChainDimension(Document doc, View view, JObject dimObj, JArray chainPoints)
        {
            List<XYZ> points = new List<XYZ>();
            foreach (JObject pt in chainPoints)
            {
                points.Add(ParseXYZ(pt));
            }

            if (points.Count < 3)
                throw new ArgumentException("Chain dimension requires at least 3 points");

            // Determine dimension line direction
            XYZ firstToLast = (points.Last() - points.First()).Normalize();

            // Create a reference array from the points
            // In practice, these should snap to element faces/references
            ReferenceArray refArray = new ReferenceArray();
            // Each point needs a reference — typically from grids, walls, or detail lines

            // Determine dimension line position
            JObject linePt = dimObj["linePoint"] as JObject;
            XYZ linePoint = linePt != null ? ParseXYZ(linePt) : points.First() + new XYZ(0, -3, 0); // default offset

            Line dimLine = Line.CreateBound(
                new XYZ(points.First().X, linePoint.Y, linePoint.Z),
                new XYZ(points.Last().X, linePoint.Y, linePoint.Z)
            );

            return doc.Create.NewDimension(view, dimLine, refArray);
        }

        // =============================================
        // ANGULAR DIMENSION (between 2 lines)
        // =============================================
        private static Dimension CreateAngularDimension(Document doc, View view, JObject dimObj)
        {
            JArray elementIdsArr = dimObj["elementIds"] as JArray;
            if (elementIdsArr == null || elementIdsArr.Count < 2)
                throw new ArgumentException("Angular dimension requires 2 elementIds of line-based elements");

            Element elem1 = doc.GetElement(new ElementId(elementIdsArr[0].Value<int>()));
            Element elem2 = doc.GetElement(new ElementId(elementIdsArr[1].Value<int>()));

            if (elem1 == null || elem2 == null)
                throw new ArgumentException("One or both elements not found");

            // Get line geometry from elements
            Arc arc = GetArcBetweenLines(doc, elem1, elem2);

            ReferenceArray refArray = new ReferenceArray();
            Reference ref1 = GetElementReference(elem1);
            Reference ref2 = GetElementReference(elem2);

            if (ref1 != null) refArray.Append(ref1);
            if (ref2 != null) refArray.Append(ref2);

            return doc.Create.NewDimension(view, arc, refArray);
        }

        // =============================================
        // RADIAL / DIAMETER / ARC LENGTH DIMENSION
        // =============================================
        private static Dimension CreateRadialDimension(Document doc, View view, JObject dimObj, string dimType)
        {
            JArray elementIdsArr = dimObj["elementIds"] as JArray;
            if (elementIdsArr == null || elementIdsArr.Count < 1)
                throw new ArgumentException($"{dimType} dimension requires 1 elementId of an arc/circle element");

            Element elem = doc.GetElement(new ElementId(elementIdsArr[0].Value<int>()));
            if (elem == null)
                throw new ArgumentException("Element not found");

            Reference arcRef = GetElementReference(elem);
            if (arcRef == null)
                throw new ArgumentException("Could not get reference from element");

            // Get the arc/circle geometry
            Arc arc = GetArcFromElement(elem);
            if (arc == null)
                throw new ArgumentException("Element does not contain arc/circle geometry");

            XYZ center = arc.Center;
            XYZ pointOnArc = arc.Evaluate(0.5, true); // midpoint of arc

            Line dimLine = Line.CreateBound(center, pointOnArc);

            ReferenceArray refArray = new ReferenceArray();
            refArray.Append(arcRef);

            // Create dimension - Revit determines radial vs diameter based on DimensionType
            return doc.Create.NewDimension(view, dimLine, refArray);
        }

        // =============================================
        // HELPER: Get Reference from Element
        // =============================================
        private static Reference GetElementReference(Element elem)
        {
            Options opt = new Options();
            opt.ComputeReferences = true;
            opt.IncludeNonVisibleObjects = false;

            GeometryElement geomElem = elem.get_Geometry(opt);
            if (geomElem == null) return null;

            foreach (GeometryObject geomObj in geomElem)
            {
                if (geomObj is Solid solid)
                {
                    foreach (Face face in solid.Faces)
                    {
                        if (face.Reference != null)
                            return face.Reference;
                    }
                    foreach (Edge edge in solid.Edges)
                    {
                        if (edge.Reference != null)
                            return edge.Reference;
                    }
                }
                else if (geomObj is Curve curve)
                {
                    if (curve.Reference != null)
                        return curve.Reference;
                }
                else if (geomObj is GeometryInstance instance)
                {
                    GeometryElement instGeom = instance.GetInstanceGeometry();
                    foreach (GeometryObject instObj in instGeom)
                    {
                        if (instObj is Curve instCurve && instCurve.Reference != null)
                            return instCurve.Reference;
                    }
                }
            }
            return null;
        }

        // =============================================
        // HELPER: Get Arc from Element
        // =============================================
        private static Arc GetArcFromElement(Element elem)
        {
            Options opt = new Options();
            opt.ComputeReferences = true;

            GeometryElement geomElem = elem.get_Geometry(opt);
            if (geomElem == null) return null;

            foreach (GeometryObject geomObj in geomElem)
            {
                if (geomObj is Arc arc) return arc;
                if (geomObj is GeometryInstance instance)
                {
                    foreach (GeometryObject instObj in instance.GetInstanceGeometry())
                    {
                        if (instObj is Arc instArc) return instArc;
                    }
                }
            }
            return null;
        }

        // =============================================
        // HELPER: Get Arc Between Lines (for angular dim)
        // =============================================
        private static Arc GetArcBetweenLines(Document doc, Element elem1, Element elem2)
        {
            // Get lines from elements
            LocationCurve loc1 = elem1.Location as LocationCurve;
            LocationCurve loc2 = elem2.Location as LocationCurve;

            if (loc1 == null || loc2 == null)
                throw new ArgumentException("Elements must be line-based for angular dimensions");

            Line line1 = loc1.Curve as Line;
            Line line2 = loc2.Curve as Line;

            if (line1 == null || line2 == null)
                throw new ArgumentException("Element curves must be lines for angular dimensions");

            // Find intersection point
            XYZ dir1 = line1.Direction;
            XYZ dir2 = line2.Direction;
            XYZ origin1 = line1.Origin;

            // Use intersection or midpoint as arc center
            XYZ center = origin1; // simplified — actual intersection calculation needed

            double radius = 2.0; // 2 feet radius for the angular dimension arc
            double angle = dir1.AngleTo(dir2);

            XYZ normal = dir1.CrossProduct(dir2).Normalize();
            if (normal.IsZeroLength()) normal = XYZ.BasisZ;

            return Arc.Create(center, radius, 0, angle, dir1, normal.CrossProduct(dir1));
        }

        private static Line GetDimensionLine(JObject dimObj, ReferenceArray refArray)
        {
            // Simplified — create a line parallel to the references
            JObject linePt = dimObj["linePoint"] as JObject;
            if (linePt != null)
            {
                XYZ linePoint = ParseXYZ(linePt);
                return Line.CreateBound(linePoint, linePoint + XYZ.BasisX * 10);
            }
            return Line.CreateBound(XYZ.Zero, XYZ.BasisX * 10);
        }
    }
}
