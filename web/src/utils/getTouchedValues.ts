import { FormInstance } from "antd";

export function getTouchedValues(values: any, form: FormInstance) {
    const changedValues: Record<string, any> = {};

    for (const [key, val] of Object.entries(values)) {
        if (form.isFieldTouched(key)) {
            changedValues[key] = val;
        }
    }

    return changedValues;
}