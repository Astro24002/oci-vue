export function maskSecret(value: string): string {
  if (!value) {
    return "";
  }
  if (value.length <= 4) {
    return "****";
  }
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}
