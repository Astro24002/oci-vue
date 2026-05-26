export function registryHost(baseUrl: string): string {
  return new URL(baseUrl).host;
}

export function basicAuthHeaders(username?: string, password?: string): Record<string, string> {
  if (!username || !password) {
    return {};
  }

  const auth = Buffer.from(`${username}:${password}`).toString("base64");
  return { Authorization: `Basic ${auth}` };
}

export function assertOk(res: Response): void {
  if (!res.ok) {
    throw new Error(`registry request failed with status ${res.status}`);
  }
}
