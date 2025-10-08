function getRGB(c: string) {
  return parseInt(c, 16);
}

function getsRGB(c: string) {
  return getRGB(c) / 255 <= 0.03928
    ? getRGB(c) / 255 / 12.92
    : Math.pow((getRGB(c) / 255 + 0.055) / 1.055, 2.4);
}

export function getLuminance(hexColor: string) {
  return (
    0.2126 * getsRGB(hexColor.substr(1, 2)) +
    0.7152 * getsRGB(hexColor.substr(3, 2)) +
    0.0722 * getsRGB(hexColor.substr(5, 2))
  );
}

export function getContrast(f: string, b: string) {
  const L1 = getLuminance(f);
  const L2 = getLuminance(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

export function isDarkColor(bgColor: string, weight: number = 0) {
  /*
  Returns true if the passed hex color is dark. Positive weight weighs the result
  toward true, negative weight weights toward false. Weight must be in [-1, 1].
   */

  if (!bgColor) return null;

  let whiteContrast = getContrast(bgColor, "#ffffff");
  let blackContrast = getContrast(bgColor, "#000000");

  if (weight > 0) {
    // weight > 0 weighs toward the color being considered dark
    blackContrast *= 1 - Math.abs(weight);
  } else if (weight < 0) {
    // weight < 0 weighs toward the color being considered light
    whiteContrast *= 1 - Math.abs(weight);
  }

  // if the color contrasts with white, we can assume it's dark;
  // if it contrasts with black, we can assume it's light
  return whiteContrast > blackContrast;
}

export function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
