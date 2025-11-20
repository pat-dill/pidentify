"use client";

import { useSettings } from "@/api/settings/getSettings";
import { Card, Flex, Form } from "antd";
import { ReactNode, useState } from "react";

type SectionProps = {
  title: string;
  description: string;
  icon: ReactNode;
  children?: ReactNode;
  initialValues?: Record<string, any>;
};

export function Section(props: SectionProps) {
  const { title, icon, children } = props;

  const [form] = Form.useForm();

  const [showForm, setShowForm] = useState(false);

  const { data: settings } = useSettings();

  return (
    <Card
      title={
        <Flex align="center" gap={4}>
          {icon}
          <span>{title}</span>
        </Flex>
      }
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={{
          ...settings,
          ...props.initialValues,
        }}
      >
        {children}
      </Form>
    </Card>
  );
}
