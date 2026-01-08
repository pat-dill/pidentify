import { FormInstance } from "antd";

export function getTouchedValues(
  values: any,
  form: FormInstance,
  defaultValues?: Record<string, any>,
) {
  const changedValues: Record<string, any> = {};

  for (const [key, val] of Object.entries(values)) {
    if (
      form.isFieldTouched(key) ||
      (["string", "number", "boolean"].includes(typeof defaultValues?.[key]) &&
        defaultValues?.[key] !== values?.[key])
    ) {
      changedValues[key] = val;
    }
  }

  return changedValues;
}
