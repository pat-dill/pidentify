import { useLayoutEffect } from "react";
import { Colors } from "./types";

const walkThemeColors = (
  element: HTMLElement,
  prefix: string,
  colors: Colors,
) => {
  for (const [name, val] of Object.entries(colors)) {
    if (typeof val === "string") {
      const varName = name === "DEFAULT" ? prefix : prefix + "-" + name;

      element.style.setProperty(`--${varName}`, val);
    } else {
      walkThemeColors(element, prefix + "-" + name, val);
    }
  }
};

export const applyThemeColors = (colors: Colors, element: HTMLElement) => {
  // update CSS variables with theme colors
  walkThemeColors(element, "c", colors);
};

export function useThemeColors(colors?: Colors, element?: HTMLElement) {
  useLayoutEffect(() => {
    if (!element) return;
    if (!colors) return;

    applyThemeColors(colors, element);
  }, [colors, element]);
}
