"use client";

import { useState } from "react";
import { Card, Flex, Form, Input, Modal } from "antd";
import { useSignIn } from "@/api/auth/signIn";

type SignInModalProps = {
    showing: boolean;
    setShowing: (showing: boolean) => void;
};

type FormFields = {
    username: string;
    password: string;
};

export function SignInModal({ showing, setShowing }: SignInModalProps) {
    const [form] = Form.useForm<FormFields>();

    const signInMut = useSignIn({
        onSuccess: () => {
            setShowing(false);
        },
    });

    return <Modal
        open={showing}
        onOk={() => form.submit()}
        onCancel={() => setShowing(false)}
        title="Sign In"
    >
        <Form form={form} layout="vertical" onFinish={signInMut.mutate}>
            <Flex gap={8}>
                <Form.Item name="username" label="Username" rules={[{ required: true, message: "Please enter your username" }]} style={{ width: "50%" }}>
                    <Input style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item name="password" label="Password" rules={[{ required: true, message: "Please enter your password" }]} style={{ width: "50%" }}>
                    <Input.Password style={{ width: "100%" }} />
                </Form.Item>
            </Flex>
        </Form>
    </Modal>;
}