"use client";

import { useSettings } from "@/api/settings/getSettings";
import { useUpdateSettings } from "@/api/settings/updateSettings";
import { AutoThemeProvider } from "@/contexts/ThemeContext";
import { getTouchedValues } from "@/utils/getTouchedValues";
import { Button, Card, Divider, Flex, Form } from "antd";
import { ReactNode, useState } from "react";

type SectionProps = {
  title: string;
  description: string;
  icon: ReactNode;
  children?: ReactNode;
  initialValues?: Record<string, any>;
};

export function FormSection(props: SectionProps) {
  const { title, icon, children } = props;

  const [form] = Form.useForm();
  const [formTouched, setFormTouched] = useState(false);

  const { data: settings } = useSettings();
  const updateSettingsMut = useUpdateSettings({
    onSuccess: () => setFormTouched(false),
  });

  const handleSubmit = (values: any) => {
    const changed = getTouchedValues(values, form);
    updateSettingsMut.mutate(changed);
  };

  return (
    <AutoThemeProvider>
      <Card
        title={
          <Flex align="center" gap={8}>
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
          onValuesChange={() => setFormTouched(true)}
          onFinish={handleSubmit}
        >
          {children}
        </Form>

        <Divider size="small" />

        <Flex gap={8} justify="end">
          <Button
            disabled={!formTouched}
            onClick={() => {
              form.resetFields();
              setFormTouched(false);
            }}
          >
            Reset
          </Button>

          <Button disabled={!formTouched} onClick={() => form.submit()}>
            Save
          </Button>
        </Flex>
      </Card>
    </AutoThemeProvider>
  );
}
