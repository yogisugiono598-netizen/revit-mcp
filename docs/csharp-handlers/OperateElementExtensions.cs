// ============================================================
// OperateElementExtensions.cs
// Reference C# code for new operate_element actions
// Add these cases to the existing OperateElement command handler
// in the Revit plugin's CommandSet.
// ============================================================
// Unit convention: MCP sends millimeters, Revit API uses feet.
// Conversion: 1 foot = 304.8 mm → divide mm by 304.8 to get feet.
// ============================================================

using Autodesk.Revit.DB;
using Autodesk.Revit.UI;
using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json.Linq;

namespace RevitMcp.Handlers
{
    public static class OperateElementExtensions
    {
        private const double MmToFeet = 1.0 / 304.8;

        /// <summary>
        /// Parse an XYZ point from a JSON object with x, y, z properties (in mm).
        /// Converts to Revit internal units (feet).
        /// </summary>
        private static XYZ ParseXYZ(JObject obj)
        {
            double x = obj.Value<double>("x") * MmToFeet;
            double y = obj.Value<double>("y") * MmToFeet;
            double z = obj.Value<double>("z") * MmToFeet;
            return new XYZ(x, y, z);
        }

        /// <summary>
        /// Parse an XYZ direction vector (unitless, no conversion).
        /// </summary>
        private static XYZ ParseDirection(JObject obj)
        {
            double x = obj.Value<double>("x");
            double y = obj.Value<double>("y");
            double z = obj.Value<double>("z");
            return new XYZ(x, y, z).Normalize();
        }

        // =============================================
        // ACTION: Move
        // Moves elements by a translation vector.
        // Required params: moveVector {x, y, z} in mm
        // =============================================
        public static object HandleMove(Document doc, ICollection<ElementId> elementIds, JObject data)
        {
            var moveVectorObj = data["moveVector"] as JObject;
            if (moveVectorObj == null)
                throw new ArgumentException("Move action requires 'moveVector' parameter");

            XYZ translation = ParseXYZ(moveVectorObj);

            using (Transaction tx = new Transaction(doc, "MCP Move Elements"))
            {
                tx.Start();
                ElementTransformUtils.MoveElements(doc, elementIds, translation);
                tx.Commit();
            }

            return new
            {
                success = true,
                message = $"Moved {elementIds.Count} element(s) by ({moveVectorObj["x"]}, {moveVectorObj["y"]}, {moveVectorObj["z"]}) mm",
                movedElementIds = elementIds.Select(id => id.IntegerValue).ToList()
            };
        }

        // =============================================
        // ACTION: Rotate
        // Rotates elements around a center point.
        // Required params: rotationCenter {x,y,z} in mm, rotationAngle in degrees
        // =============================================
        public static object HandleRotate(Document doc, ICollection<ElementId> elementIds, JObject data)
        {
            var centerObj = data["rotationCenter"] as JObject;
            if (centerObj == null)
                throw new ArgumentException("Rotate action requires 'rotationCenter' parameter");

            double angleDegrees = data.Value<double>("rotationAngle");
            double angleRadians = angleDegrees * Math.PI / 180.0;

            XYZ center = ParseXYZ(centerObj);
            // Rotation axis: vertical (Z-axis) through the center point
            Line axis = Line.CreateBound(center, center + XYZ.BasisZ);

            using (Transaction tx = new Transaction(doc, "MCP Rotate Elements"))
            {
                tx.Start();
                ElementTransformUtils.RotateElements(doc, elementIds, axis, angleRadians);
                tx.Commit();
            }

            return new
            {
                success = true,
                message = $"Rotated {elementIds.Count} element(s) by {angleDegrees}° around ({centerObj["x"]}, {centerObj["y"]}, {centerObj["z"]})",
                rotatedElementIds = elementIds.Select(id => id.IntegerValue).ToList()
            };
        }

        // =============================================
        // ACTION: Copy
        // Copies elements by a translation vector.
        // Required params: moveVector {x,y,z} in mm
        // Optional: copyCount (default 1) for linear array
        // =============================================
        public static object HandleCopy(Document doc, ICollection<ElementId> elementIds, JObject data)
        {
            var moveVectorObj = data["moveVector"] as JObject;
            if (moveVectorObj == null)
                throw new ArgumentException("Copy action requires 'moveVector' parameter");

            XYZ translation = ParseXYZ(moveVectorObj);
            int copyCount = data.Value<int?>("copyCount") ?? 1;

            var allNewIds = new List<int>();

            using (Transaction tx = new Transaction(doc, "MCP Copy Elements"))
            {
                tx.Start();
                for (int i = 1; i <= copyCount; i++)
                {
                    XYZ offset = translation * i;
                    ICollection<ElementId> newIds = ElementTransformUtils.CopyElements(
                        doc, elementIds, offset);
                    allNewIds.AddRange(newIds.Select(id => id.IntegerValue));
                }
                tx.Commit();
            }

            return new
            {
                success = true,
                message = $"Copied {elementIds.Count} element(s) × {copyCount} time(s)",
                sourceElementIds = elementIds.Select(id => id.IntegerValue).ToList(),
                newElementIds = allNewIds
            };
        }

        // =============================================
        // ACTION: Mirror
        // Mirrors elements across a plane.
        // Required params: mirrorPlaneOrigin {x,y,z}, mirrorPlaneNormal {x,y,z}
        // =============================================
        public static object HandleMirror(Document doc, ICollection<ElementId> elementIds, JObject data)
        {
            var originObj = data["mirrorPlaneOrigin"] as JObject;
            var normalObj = data["mirrorPlaneNormal"] as JObject;
            if (originObj == null || normalObj == null)
                throw new ArgumentException("Mirror action requires 'mirrorPlaneOrigin' and 'mirrorPlaneNormal' parameters");

            XYZ origin = ParseXYZ(originObj);
            XYZ normal = ParseDirection(normalObj);
            Plane mirrorPlane = Plane.CreateByNormalAndOrigin(normal, origin);

            using (Transaction tx = new Transaction(doc, "MCP Mirror Elements"))
            {
                tx.Start();
                ElementTransformUtils.MirrorElements(doc, elementIds, mirrorPlane, true);
                tx.Commit();
            }

            return new
            {
                success = true,
                message = $"Mirrored {elementIds.Count} element(s)",
                mirroredElementIds = elementIds.Select(id => id.IntegerValue).ToList()
            };
        }

        // =============================================
        // ACTION: SetParameter
        // Sets a named parameter on elements.
        // Required params: parameterName (string), parameterValue (string|number|bool)
        // =============================================
        public static object HandleSetParameter(Document doc, ICollection<ElementId> elementIds, JObject data)
        {
            string paramName = data.Value<string>("parameterName");
            if (string.IsNullOrEmpty(paramName))
                throw new ArgumentException("SetParameter action requires 'parameterName' parameter");

            JToken paramValueToken = data["parameterValue"];
            if (paramValueToken == null)
                throw new ArgumentException("SetParameter action requires 'parameterValue' parameter");

            var results = new List<object>();

            using (Transaction tx = new Transaction(doc, "MCP Set Parameter"))
            {
                tx.Start();

                foreach (ElementId id in elementIds)
                {
                    Element element = doc.GetElement(id);
                    if (element == null)
                    {
                        results.Add(new { elementId = id.IntegerValue, success = false, error = "Element not found" });
                        continue;
                    }

                    Parameter param = element.LookupParameter(paramName);
                    if (param == null)
                    {
                        results.Add(new { elementId = id.IntegerValue, success = false, error = $"Parameter '{paramName}' not found" });
                        continue;
                    }

                    if (param.IsReadOnly)
                    {
                        results.Add(new { elementId = id.IntegerValue, success = false, error = $"Parameter '{paramName}' is read-only" });
                        continue;
                    }

                    bool setOk = false;
                    switch (param.StorageType)
                    {
                        case StorageType.String:
                            setOk = param.Set(paramValueToken.ToString());
                            break;
                        case StorageType.Integer:
                            if (paramValueToken.Type == JTokenType.Boolean)
                                setOk = param.Set(paramValueToken.Value<bool>() ? 1 : 0);
                            else
                                setOk = param.Set(paramValueToken.Value<int>());
                            break;
                        case StorageType.Double:
                            // Convert mm to feet for length parameters
                            double val = paramValueToken.Value<double>();
                            if (param.Definition is InternalDefinition intDef)
                            {
                                // Check if the parameter uses length units
                                var specTypeId = param.Definition.GetDataType();
                                if (specTypeId == SpecTypeId.Length)
                                    val *= MmToFeet;
                                else if (specTypeId == SpecTypeId.Angle)
                                    val = val * Math.PI / 180.0; // degrees to radians
                                else if (specTypeId == SpecTypeId.Area)
                                    val *= MmToFeet * MmToFeet;
                                else if (specTypeId == SpecTypeId.Volume)
                                    val *= MmToFeet * MmToFeet * MmToFeet;
                            }
                            setOk = param.Set(val);
                            break;
                        case StorageType.ElementId:
                            setOk = param.Set(new ElementId(paramValueToken.Value<int>()));
                            break;
                    }

                    results.Add(new
                    {
                        elementId = id.IntegerValue,
                        success = setOk,
                        parameterName = paramName,
                        newValue = paramValueToken.ToString()
                    });
                }

                tx.Commit();
            }

            return new
            {
                success = true,
                message = $"SetParameter '{paramName}' on {elementIds.Count} element(s)",
                results = results
            };
        }

        // =============================================
        // ACTION: Rename
        // Renames elements (Grids, Levels, Views, Sheets, etc.)
        // Required params: newName (string)
        // Note: Only works on elements with a settable Name property
        // =============================================
        public static object HandleRename(Document doc, ICollection<ElementId> elementIds, JObject data)
        {
            string newName = data.Value<string>("newName");
            if (string.IsNullOrEmpty(newName))
                throw new ArgumentException("Rename action requires 'newName' parameter");

            var results = new List<object>();

            using (Transaction tx = new Transaction(doc, "MCP Rename Element"))
            {
                tx.Start();

                foreach (ElementId id in elementIds)
                {
                    Element element = doc.GetElement(id);
                    if (element == null)
                    {
                        results.Add(new { elementId = id.IntegerValue, success = false, error = "Element not found" });
                        continue;
                    }

                    string oldName = element.Name;
                    try
                    {
                        // For single rename, use the name directly
                        // For multiple elements, append index
                        string nameToSet = elementIds.Count == 1 ? newName : $"{newName}_{results.Count + 1}";
                        element.Name = nameToSet;
                        results.Add(new
                        {
                            elementId = id.IntegerValue,
                            success = true,
                            oldName = oldName,
                            newName = nameToSet
                        });
                    }
                    catch (Exception ex)
                    {
                        results.Add(new
                        {
                            elementId = id.IntegerValue,
                            success = false,
                            oldName = oldName,
                            error = $"Cannot rename: {ex.Message}"
                        });
                    }
                }

                tx.Commit();
            }

            return new
            {
                success = true,
                message = $"Renamed {results.Count(r => ((dynamic)r).success)} of {elementIds.Count} element(s)",
                results = results
            };
        }

        // =============================================
        // DISPATCHER — Add this switch block to your
        // existing OperateElement command handler
        // =============================================
        /*
        case "Move":
            return HandleMove(doc, elementIds, data);
        case "Rotate":
            return HandleRotate(doc, elementIds, data);
        case "Copy":
            return HandleCopy(doc, elementIds, data);
        case "Mirror":
            return HandleMirror(doc, elementIds, data);
        case "SetParameter":
            return HandleSetParameter(doc, elementIds, data);
        case "Rename":
            return HandleRename(doc, elementIds, data);
        */
    }
}
