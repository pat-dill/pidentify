import ColorThief from "colorthief";
import { rgbToHex } from "@/utils/contrast";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

const cf = new ColorThief();

export const getImageColor = (img: HTMLImageElement) => {
  const [r, g, b] = cf.getColor(img);
  return rgbToHex(r, g, b);
};

export function useImageColor(imgEl?: HTMLImageElement): string | undefined {
  return useQuery({
    enabled: !!imgEl?.src,
    queryKey: ["image-color", imgEl?.src],
    queryFn: () =>
      new Promise((resolve, reject) => {
        if (!imgEl?.src) return;

        if (imgEl?.complete) {
          try {
            resolve(getImageColor(imgEl));
          } catch (e) {
            reject(e);
          }
        }

        imgEl.onload = () => {
          try {
            resolve(getImageColor(imgEl));
          } catch (e) {
            reject(e);
          }
        };
      }),
    placeholderData: (prev) => keepPreviousData(prev),
    staleTime: Infinity,
  }).data as string | undefined;
}

export function useImageColorFromUrl(url: string | null | undefined) {
  return useQuery<string | null>({
    queryKey: ["image-color", url],
    queryFn: () => {
      return new Promise<string | null>((resolve, reject) => {
        if (!url) {
          resolve(null);
          return;
        }

        let img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          try {
            resolve(getImageColor(img));
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => reject(new Error("Image failed to load"));
        img.src = url;
      });
    },
    staleTime: Infinity,
  }).data;
}
