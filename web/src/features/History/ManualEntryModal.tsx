import { useHistoryAlbums } from "@/api/history/getHistoryAlbums";
import { useAnimationFrame } from "@/utils/useAnimationFrame";
import { AutoComplete, Flex, Form, Input, InputNumber, Modal } from "antd";
import { useEffect, useMemo, useState } from "react";

type ManualEntryFormFields = {
    formOpenedAt: number;
    timeSinceEnd: number;
    estimatedDuration: number;
    trackNo: number;
    trackName: string;
    albumName: string;
    artistName: string;
    trackImageUrl: string;
}


type ManualEntryModalProps = {
    open: boolean;
    onClose: () => void;
}

export function ManualEntryModal({ open, onClose }: ManualEntryModalProps) {
    const [form] = Form.useForm<ManualEntryFormFields>();

    const initialValues = useMemo(() => ({
        formOpenedAt: new Date().valueOf() / 1000,
        timeSinceEnd: 0,
        estimatedDuration: 0,
        trackName: "",
        albumName: "",
        artistName: "",
    }), [open]);

    useEffect(() => {
        form.resetFields();
    }, [open]);

    const [currentTime, setCurrentTime] = useState(Math.floor(new Date().valueOf() / 1000));
    useAnimationFrame(() => {
        if (!open) return;
        setCurrentTime(Math.floor(new Date().valueOf() / 1000));
    });

    const artistName = Form.useWatch("artistName", form);

    const { data: albums } = useHistoryAlbums({
        enabled: open,
    });

    const sameArtistAlbums = useMemo(() => {
        return albums?.data.filter((album) => album.artist === artistName) ?? [];
    }, [albums, artistName]);

    const albumOptions = useMemo(() => {
        return sameArtistAlbums.map((album) => ({
            label: album.album,
            value: album.album,
        }));
    }, [sameArtistAlbums]);

    return (
        <Modal
            open={open}
            onCancel={onClose}
            destroyOnHidden={true}
            onOk={() => form.submit()}
            title="Add Undetected Track"
        >
            <Form
                form={form}
                initialValues={initialValues}
                layout="vertical"
            >
                <Form.Item name="formOpenedAt" hidden>
                    <InputNumber<number> />
                </Form.Item>

                <Flex gap={5} style={{ width: "100%" }}>
                    <Form.Item label="Track ended" name="timeSinceEnd" style={{ width: "70%" }}>
                        <InputNumber<number> suffix="seconds before form opened" style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item label="Estimated duration" name="estimatedDuration" style={{ width: "30%" }}>
                        <InputNumber<number>
                            min={0}
                            formatter={(duration) => {
                                return duration
                                    ? `${Math.floor(duration / 60)}:${Math.floor(duration % 60)
                                        .toString()
                                        .padStart(2, "0")}`
                                    : "";
                            }}
                            parser={(val) => {
                                if (!val) return null as unknown as number;
                                let [mins, secs] = val.split(":");
                                secs = secs.replace(/^0/, "").slice(0, 2);
                                return parseFloat(mins) * 60 + parseFloat(secs);
                            }}
                            placeholder="Unknown"
                            style={{ width: "100%" }}
                        />
                    </Form.Item>
                </Flex>

                <Flex gap={5} style={{ width: "100%" }}>
                    <Form.Item name="trackNo" label="Track No." style={{ width: 75 }}>
                        <InputNumber<number>
                            min={1}
                            placeholder="1"
                            style={{ width: "100%" }}
                        />
                    </Form.Item>
                    <Form.Item label="Track" name="trackName" rules={[{ required: true }]} style={{ flexGrow: 1 }}>
                        <Input />
                    </Form.Item>
                </Flex>

                <Flex gap={5} style={{ width: "100%" }}>
                    <Form.Item
                        label="Artist"
                        name="artistName"
                        rules={[{ required: true }]}
                        style={{ width: "50%" }}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Album"
                        name="albumName"
                        rules={[{ required: true }]}
                        style={{ width: "50%" }}
                    >
                        <AutoComplete
                            options={albumOptions}
                            onSelect={(value) => {
                                const trackImage = sameArtistAlbums.find(
                                    (album) => album.album === value,
                                )?.album_image_url;
                                if (trackImage) {
                                    form.setFieldValue("trackImageUrl", trackImage);
                                }
                            }}
                        />
                    </Form.Item>
                </Flex>

                <Form.Item label="Track Image" name="trackImageUrl" hidden>
                    <Input />
                </Form.Item>
            </Form>
        </Modal>
    )
}