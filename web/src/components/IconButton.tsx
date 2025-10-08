import { ReactNode } from "react";
import clsx from "clsx";
import { useTheme } from "../contexts/ThemeContext";
import { isDarkColor } from "@/utils/contrast";

interface IconButtonProps {
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  href?: string;
  [_: string]: any;
}

export default function IconButton({
  icon,
  children,
  className,
  href,
  ...rest
}: IconButtonProps) {
  const El = !!href ? "a" : "button";
  const { backgroundColor } = useTheme();
  const textColor = isDarkColor(backgroundColor)
    ? "text-white/80"
    : "text-black/70";

  return (
    <El
      className={clsx(
        "w-full  bg-background-1 overflow-hidden",
        "px-4 py-3 flex items-center gap-3 font-medium text-lg",
        textColor,
        className,
      )}
      href={href}
      {...rest}
    >
      <span className="text-xl">{icon}</span>
      <div className="w-full flex items-center justify-center">{children}</div>
    </El>
  );
}
