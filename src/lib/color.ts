/**
 * Color and luminance utilities for WCAG contrast compliance.
 */

export const LUMINANCE_THRESHOLDS = {
  /** Upper bound of relative luminance for cream ink (#fff8e9) to achieve >= 4.5:1 contrast */
  CREAM_INK_MAX_LUMINANCE: 0.1706,
  /** Lower bound of relative luminance for dark ink (#251e15) to achieve >= 4.5:1 contrast */
  DARK_INK_MIN_LUMINANCE: 0.2369,
} as const;

export const INK_PALETTE = {
  CREAM: {
    ink: "#fff8e9",
    inkAccent: "rgba(255, 248, 233, 0.55)",
  },
  DARK: {
    ink: "#251e15",
    inkAccent: "rgba(37, 30, 21, 0.45)",
  },
} as const;

export function srgbChannel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/**
 * Calculates the WCAG 2.x relative luminance of a 6-digit hex color (#rrggbb).
 */
export function relativeLuminance(hex: string): number {
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  const [r, g, b] = [0, 2, 4].map((index) =>
    srgbChannel(parseInt(cleanHex.slice(index, index + 2), 16)),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Validates whether a hex color avoids the contrast dead zone (0.1706 < L < 0.2369)
 * where neither cream nor dark ink can reach 4.5:1 contrast.
 */
export function inkContrastIsSafe(hex: string): boolean {
  const luminance = relativeLuminance(hex);
  return !(
    luminance > LUMINANCE_THRESHOLDS.CREAM_INK_MAX_LUMINANCE &&
    luminance < LUMINANCE_THRESHOLDS.DARK_INK_MIN_LUMINANCE
  );
}

/**
 * Selects the WCAG-compliant ink and accent color for a book cover based on background accent.
 */
export function getCoverInkColors(accentHex: string) {
  const isDarkBackground =
    relativeLuminance(accentHex) <= LUMINANCE_THRESHOLDS.CREAM_INK_MAX_LUMINANCE;
  return isDarkBackground ? INK_PALETTE.CREAM : INK_PALETTE.DARK;
}
