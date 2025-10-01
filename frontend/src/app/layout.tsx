import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/app/providers";
import Debug from "@/components/Debug";
import "antd/dist/reset.css";
import { ConfigProvider } from "antd";
import { ReactNode } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "pidentify",
  description: "what's playing right now?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AntdRegistry>
          <ConfigProvider
            theme={{
              token: {
                borderRadius: 0,
                fontFamily: "Geist",
                lineHeight: 1.15,
              },
            }}
          >
            <Providers>{children}</Providers>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
