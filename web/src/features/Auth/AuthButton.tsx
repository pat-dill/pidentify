"use client";

import { useCheckAuth } from "@/api/auth/checkAuth";
import { LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { Link } from "next-view-transitions";
import { useState } from "react";
import { SignInModal } from "./SignInModal";
import { useSignOut } from "@/api/auth/signOut";

export function AuthButton() {
    const { data: session } = useCheckAuth({ suspend: true });
    const [showing, setShowing] = useState(false);

    const signOutMut = useSignOut();

    return <>
        {!session && <button onClick={() => setShowing(true)}>
            <UserOutlined />
        </button>}
        {session && <button onClick={() => signOutMut.mutate()}>
            <LogoutOutlined />
        </button>}

        <SignInModal showing={showing} setShowing={setShowing} />
    </>
}