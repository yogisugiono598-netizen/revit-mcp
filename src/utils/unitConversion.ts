/**
 * Centralized unit conversion utilities for Revit MCP Server.
 *
 * Revit internally stores all dimensions in imperial units (feet).
 * These utilities convert raw Revit API values to metric units
 * for consistent output regardless of project settings.
 *
 * Fixes: B02, B04, B05, B09
 */

// Conversion constants
const FEET_TO_MM = 304.8;
const FEET_TO_M = 0.3048;
const SQ_FEET_TO_SQ_M = 0.09290304;
const CU_FEET_TO_CU_M = 0.02831685;

/**
 * Convert feet to millimeters
 */
export function feetToMm(feet: number): number {
  return Math.round(feet * FEET_TO_MM * 100) / 100;
}

/**
 * Convert feet to meters
 */
export function feetToM(feet: number): number {
  return Math.round(feet * FEET_TO_M * 1000) / 1000;
}

/**
 * Convert square feet to square meters
 */
export function sqFeetToSqM(sqFeet: number): number {
  return Math.round(sqFeet * SQ_FEET_TO_SQ_M * 100) / 100;
}

/**
 * Convert cubic feet to cubic meters
 */
export function cuFeetToCuM(cuFeet: number): number {
  return Math.round(cuFeet * CU_FEET_TO_CU_M * 1000) / 1000;
}

/**
 * Format a number with reasonable precision, removing trailing zeros
 */
export function formatNum(value: number, decimals: number = 2): string {
  return parseFloat(value.toFixed(decimals)).toString();
}

/**
 * Known Chinese parameter name to English mapping.
 * Revit API returns localized parameter names based on installation language.
 * This mapping provides English equivalents for common Chinese parameter names.
 *
 * Fixes: B03
 */
export const CHINESE_TO_ENGLISH_PARAMS: Record<string, string> = {
  // Dimensions
  "厚度": "Thickness",
  "高度": "Height",
  "宽度": "Width",
  "长度": "Length",
  "深度": "Depth",
  "面积": "Area",
  "体积": "Volume",
  "周长": "Perimeter",
  // Wall parameters
  "底部偏移": "Base Offset",
  "顶部偏移": "Top Offset",
  "底部限制条件": "Base Constraint",
  "顶部限制条件": "Top Constraint",
  "无连接高度": "Unconnected Height",
  "定位线": "Location Line",
  // Common parameters
  "注释": "Comments",
  "标记": "Mark",
  "类型名称": "Type Name",
  "族名称": "Family Name",
  "类型": "Type",
  "阶段": "Phase",
  "房间名称": "Room Name",
  "房间编号": "Room Number",
  "级别": "Level",
  "偏移量": "Offset",
  // Material
  "材质": "Material",
  "功能": "Function",
  "结构": "Structural",
};

/**
 * Known Chinese response messages to English mapping.
 * Fixes: B07
 */
export const CHINESE_TO_ENGLISH_MESSAGES: Record<string, string> = {
  "成功创建": "Successfully created",
  "个族实例": " family instance(s)",
  "创建失败": "Creation failed",
  "未找到": "Not found",
  "已存在": "Already exists",
  "参数错误": "Parameter error",
  "连接到Revit客户端失败": "Failed to connect to Revit client",
  "操作成功": "Operation successful",
  "操作失败": "Operation failed",
  "元素不存在": "Element does not exist",
  "类型不存在": "Type does not exist",
};

/**
 * Translate Chinese parameter name to English if a mapping exists.
 * Returns the original name if no mapping found.
 */
export function translateParamName(name: string): string {
  return CHINESE_TO_ENGLISH_PARAMS[name] || name;
}

/**
 * Translate Chinese text in a string by replacing known Chinese phrases.
 * Returns the translated string.
 */
export function translateChineseText(text: string): string {
  let result = text;
  for (const [chinese, english] of Object.entries(CHINESE_TO_ENGLISH_MESSAGES)) {
    result = result.replace(new RegExp(chinese, "g"), english);
  }
  return result;
}

/**
 * Deep-translate Chinese parameter names and messages in a response object.
 * Recursively processes objects and arrays, translating:
 * - Property keys that match known Chinese parameter names
 * - String values that contain known Chinese text
 * - Properties named "name", "parameterName", etc. with Chinese values
 */
export function translateResponse(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    return translateChineseText(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => translateResponse(item));
  }

  if (typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const translatedKey = translateParamName(key);

      if (
        typeof value === "string" &&
        (key === "name" || key === "parameterName" || key === "message" || key === "description")
      ) {
        result[translatedKey] = translateChineseText(value);
      } else {
        result[translatedKey] = translateResponse(value);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Convert coordinate values in a response object from feet to mm.
 * Looks for common coordinate property names (x, y, z, location, etc.)
 * and converts their numeric values.
 */
export function convertResponseCoordinates(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => convertResponseCoordinates(item));
  }

  if (typeof obj === "object") {
    const result: any = {};
    const coordKeys = new Set([
      "x", "y", "z",
      "locationX", "locationY", "locationZ",
      "startX", "startY", "startZ",
      "endX", "endY", "endZ",
      "midX", "midY", "midZ",
    ]);
    const lengthKeys = new Set([
      "elevation", "height", "width", "length", "depth",
      "offset", "baseOffset", "topOffset",
    ]);

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "number" && coordKeys.has(key)) {
        result[key] = feetToMm(value);
      } else if (typeof value === "number" && lengthKeys.has(key)) {
        result[key] = feetToMm(value);
      } else if (typeof value === "object") {
        result[key] = convertResponseCoordinates(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return obj;
}
