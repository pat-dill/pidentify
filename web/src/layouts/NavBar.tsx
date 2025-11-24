"use client";

import { Flex, theme } from "antd";
import { SettingsButton } from "@/features/Settings/SettingsButton";
import { AuthButton } from "@/features/Auth/AuthButton";
import { AutoThemeProvider } from "@/contexts/ThemeContext";

export function _NavBar() {
    const {
        token: { colorBgBase },
    } = theme.useToken();

    return <Flex align="center" gap={8} style={{
        position: "fixed",
        top: 10,
        right: 10,
        fontFamily: "Geist Mono",
        color: colorBgBase,
        fontSize: 16,
    }}>
        <SettingsButton />
        <AuthButton />
    </Flex>

}

export function NavBar() {
    return <AutoThemeProvider>
        <_NavBar />
    </AutoThemeProvider>
}