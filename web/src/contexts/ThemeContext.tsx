"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { useImageColorFromUrl } from "@/utils/useImageColor";
import { useStatus } from "@/contexts/StatusContext";
import { ConfigProvider } from "antd";
import { isDarkColor } from "@/utils/contrast";

interface ThemeT {
  backgroundColor: string;
  textColor: string;
}

const themeContext = createContext<ThemeT>(undefined!);

type ThemeProviderProps = {
  sourceUrl?: string | null;
  sourceImage?: HTMLImageElement;
  children: ReactNode;
  root?: boolean;
};

const BG_COLOR_WEIGHT = 0.7; // how weighted the root background is to being dark
const TEXT_COLOR_WEIGHT = 0.8; // how weighted the root text is to being light

export function ThemeProvider({
  sourceUrl,
  sourceImage,
  children,
  root,
}: ThemeProviderProps) {
  const [imgSrc, setImgSrc] = useState(sourceUrl ?? "");
  useEffect(() => {
    setImgSrc(sourceUrl ?? sourceImage?.src ?? "");
  });
  const imgColor = useImageColorFromUrl(imgSrc);

  const backgroundColor = imgColor ?? "#111111";

  const lightText = isDarkColor(
    backgroundColor,
    root ? TEXT_COLOR_WEIGHT : 0.15,
  );

  const textColor = lightText ? "#ffffff" : "#000000";

  const colorTextDescription = lightText
    ? "rgba(255, 255, 255, 0.45)"
    : "rgba(0, 0, 0, 0.45)";

  const colorTextDisabled = lightText
    ? "rgba(255, 255, 255, 0.45)"
    : "rgba(0, 0, 0, 0.45)";

  const colorTextPlaceholder = lightText
    ? "rgba(255, 255, 255, 0.25)"
    : "rgba(0, 0, 0, 0.25)";

  useLayoutEffect(() => {
    if (root) {
      const isBgDark = isDarkColor(backgroundColor, -BG_COLOR_WEIGHT);
      const bodyBackgroundColor = `color-mix(in srgb, ${backgroundColor}, ${isBgDark ? "white 10%" : "black 33%"})`;
      document.body.style.setProperty("--background", bodyBackgroundColor);
    }
  }, [root, backgroundColor]);

  const localTheme = {
    backgroundColor,
    textColor,
  };

  return (
    <themeContext.Provider value={localTheme}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#1677ff",
            colorBgBase: backgroundColor,
            colorText: textColor,
            colorTextDescription,
            colorTextDisabled,
            colorTextPlaceholder,
            colorLink: textColor,
            borderRadius: 0,
            paddingLG: 16,
            paddingMD: 12,
            paddingSM: 8,
            paddingXS: 4,
            paddingXXS: 2,
            lineHeight: 1.4,
          },
          components: {
            Form: {
              itemMarginBottom: 12,
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </themeContext.Provider>
  );
}

export function AutoThemeProvider({
  children,
  root,
}: {
  children?: ReactNode;
  root?: boolean;
}) {
  const status = useStatus();

  return (
    <ThemeProvider sourceUrl={status?.track?.track_image} root={root}>
      {children}
    </ThemeProvider>
  );
}

export const useTheme = () => useContext(themeContext);
