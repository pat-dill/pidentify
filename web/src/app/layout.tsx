import "./globals.css";
import Providers from "@/app/providers";
import "antd/dist/reset.css";
import { ConfigProvider } from "antd";
import { ReactNode } from "react";
import { Helmet } from "react-helmet-async";

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      <Helmet>
        <title>pidentify</title>
        <meta name="description" content="what's playing right now?" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </Helmet>
      <div className="antialiased" style={{ fontFamily: "var(--font-geist-sans)" }}>
        <ConfigProvider
          theme={{
            token: {
              borderRadius: 0,
              fontFamily: "var(--font-geist-sans)",
              fontFamilyCode: "var(--font-geist-mono)",
              lineHeight: 1.15,
            },
          }}
        >
          <Providers>{children}</Providers>
        </ConfigProvider>
      </div>
    </>
  );
}
