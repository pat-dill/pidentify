"use client";

import { Flex, Form, InputNumber, Select } from "antd";

import { useDevices } from "@/api/settings/getDevices";
import { useMemo } from "react";

export function SoundSettingsForm() {
  const { data: devices } = useDevices();

  const deviceOptions = useMemo(() => {
    return (
      devices
        ?.filter((device) => device.max_input_channels > 0)
        ?.map((device) => ({
          label: device.name,
          value: device.name,
        })) ?? []
    );
  }, [devices]);

  const selectedDeviceName = Form.useWatch("device");
  const selectedDevice = useMemo(() => {
    return devices?.find((device) => device.name === selectedDeviceName);
  }, [devices, selectedDeviceName]);

  return (
    <>
      <Form.Item
        label="Device"
        name="device"
        rules={[{ required: true, message: "Please select a device" }]}
      >
        <Select options={deviceOptions} />
      </Form.Item>

      <Flex gap={12} justify="space-between">
        <Form.Item label="Channels" name="channels" style={{ width: "50%" }}>
          <InputNumber
            placeholder={selectedDevice?.max_input_channels?.toString()}
            min={1}
            max={selectedDevice?.max_input_channels}
            style={{ width: "100%" }}
          />
        </Form.Item>

        <Form.Item
          label="Sample rate"
          name="sample_rate"
          style={{ width: "50%" }}
        >
          <InputNumber
            placeholder={selectedDevice?.default_samplerate?.toString()}
            style={{ width: "100%" }}
          />
        </Form.Item>
      </Flex>

      <Flex gap={12} justify="space-between">
        <Form.Item
          label="Silence threshold (RMS)"
          name="silence_threshold"
          rules={[
            { required: true, message: "Please enter a silence threshold" },
          ]}
          style={{ width: "50%" }}
        >
          <InputNumber
            min={0}
            max={1}
            step={0.0001}
            style={{ width: "100%" }}
          />
        </Form.Item>

        <Form.Item
          label="Device offset"
          name="device_offset"
          style={{ width: "50%" }}
          tooltip="If the timestamp is too far behind, increase the value. If the timestamp is too far ahead, decrease the value."
        >
          <InputNumber
            min={-5}
            max={5}
            step={0.1}
            style={{ width: "100%" }}
            placeholder="0"
          />
        </Form.Item>
      </Flex>

      <Flex gap={12} justify="space-between">
        <Form.Item
          label="Buffer length"
          name="buffer_length_seconds"
          rules={[{ required: true, message: "Please enter a buffer length" }]}
          style={{ width: "50%" }}
          tooltip="Length of the audio buffer to store in memory; this is the maximum duration of a song that can be saved."
        >
          <InputNumber style={{ width: "100%" }} min={60} suffix="seconds" />
        </Form.Item>

        <Form.Item
          label="Music ID length"
          name="duration"
          rules={[
            { required: true, message: "Please enter a music ID length" },
          ]}
          style={{ width: "50%" }}
          tooltip="Length of the audio buffer to send to the Music ID plugin."
        >
          <InputNumber style={{ width: "100%" }} min={8} max={15} suffix="seconds" />
        </Form.Item>
      </Flex>
    </>
  );
}
