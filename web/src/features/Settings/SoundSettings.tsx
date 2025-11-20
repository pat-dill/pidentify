"use client";

import { AudioOutlined } from "@ant-design/icons";
import { Section } from "./Section";
import { Form, InputNumber, Select } from "antd";

import { useDevices } from "@/api/settings/getDevices";
import { useMemo } from "react";

export function SoundSettingsForm() {
    const { data: devices } = useDevices();

    const deviceOptions = useMemo(() => {
        return devices?.filter(device => device.max_input_channels > 0)?.map((device) => ({
            label: device.name,
            value: device.name,
        })) ?? [];
    }, [devices]);


    const selectedDeviceName = Form.useWatch("device");
    const selectedDevice = useMemo(() => {
        return devices?.find(device => device.name === selectedDeviceName);
    }, [devices, selectedDeviceName]);

    return <>
        <Form.Item label="Device" name="device" rules={[{ required: true, message: "Please select a device" }]}>
            <Select options={deviceOptions} />
        </Form.Item>

        <Form.Item label="Channels" name="channels">
            <InputNumber placeholder={selectedDevice?.max_input_channels?.toString()} min={1} max={selectedDevice?.max_input_channels} />
        </Form.Item>

        <Form.Item label="Sample rate" name="sample_rate">
            <InputNumber placeholder={selectedDevice?.default_samplerate?.toString()} />
        </Form.Item>

        <Form.Item label="Silence threshold (RMS)" name="silence_threshold" rules={[{ required: true, message: "Please enter a silence threshold" }]}>
            <InputNumber min={0} max={1} step={0.0001} />
        </Form.Item>
    </>
}
