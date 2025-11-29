import { Flex, Form, InputNumber } from "antd";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";

export type TrackBoundsValue = {
    startedAt: Date;
    duration: number;
}

type TrackBoundsInputProps = {
    value?: TrackBoundsValue;
    onChange?: (value: TrackBoundsValue) => void;
    anchorTime: Date;
}

export function TrackBoundsInput({ value: valueProp, onChange, anchorTime }: TrackBoundsInputProps) {
    const [touchedOrder, setTouchedOrder] = useState<string[]>([]);
    const onTouched = useCallback((key: string) => {
        if (key === touchedOrder[0]) return;
        setTouchedOrder(prev => [key, ...prev].slice(0, 2));
    }, [touchedOrder]);

    const value = useMemo(() => {
        return valueProp ?? {
            startedAt: anchorTime,
            duration: 60,
        }
    }, [valueProp, anchorTime]);

    const { startedAt, duration } = value;
    const endedAt = useMemo(() => {
        return new Date(startedAt.valueOf() + duration * 1000);
    }, [startedAt, duration]);

    return <Flex gap={5} align="center" style={{ width: "100%" }}>
        <Form.Item label="Started at" style={{ width: "33%" }}>
            <InputNumber
                style={{ width: "100%" }}
                value={startedAt.valueOf() / 1000}
                formatter={value => {
                    if (value) {
                        return dayjs(value * 1000).format("h:mm:ss A")
                    } else {
                        return ""
                    }
                }}
                onChange={(newStartedAt: number | null) => {
                    if (!newStartedAt) return;

                    const newValue = {
                        ...value,
                        startedAt: new Date(newStartedAt * 1000),
                    }

                    if (touchedOrder.includes("endedAt")) {
                        newValue.duration = endedAt.valueOf() / 1000 - newStartedAt;
                    }

                    onChange?.(newValue);
                }}
                onFocus={() => onTouched("startedAt")}
            />
        </Form.Item>

        <Form.Item label="Duration" style={{ width: "33%" }}>
            <InputNumber<number>
                style={{ width: "100%" }}
                value={duration}
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
                onChange={(newDuration: number | null) => {
                    if (!newDuration) return;

                    const newValue = {
                        ...value,
                        duration: newDuration ?? 0,
                    }

                    if (touchedOrder.includes("endedAt")) {
                        newValue.startedAt = dayjs(endedAt).subtract(newDuration, "seconds").toDate();
                    }

                    onChange?.(newValue);
                }}
                onFocus={() => onTouched("duration")}
            />
        </Form.Item>

        <Form.Item label="Ended at" style={{ width: "33%" }}>
            <InputNumber
                style={{ width: "100%" }}
                value={endedAt.valueOf() / 1000}
                formatter={value => {
                    if (value) {
                        return dayjs(value * 1000).format("h:mm:ss A")
                    } else {
                        return ""
                    }
                }}
                onChange={(newEndedAtSecs: number | null) => {
                    if (!newEndedAtSecs) return;

                    const deltaSecs = newEndedAtSecs - endedAt.valueOf() / 1000

                    const newValue = {
                        ...value
                    }

                    if (touchedOrder.includes("duration")) {
                        newValue.startedAt = dayjs(startedAt).add(deltaSecs, "seconds").toDate();
                    } else {
                        newValue.duration = duration + deltaSecs;
                    }

                    onChange?.(newValue);
                }}
                onFocus={() => onTouched("endedAt")}
            />
        </Form.Item>
    </Flex>
}