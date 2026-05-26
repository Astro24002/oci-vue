export function maskSecret(value?: string | null): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (!value) {
    return "";
  }
  return "******";
}
