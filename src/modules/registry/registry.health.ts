import type { RegistryConfig } from "../config/config.types.js";

export async function testRegistryConnectivity(
  registry: RegistryConfig,
  timeoutMs: number
) {
  const started = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const url = new URL("/v2/", registry.baseUrl).toString();
    const auth = Buffer.from(`${registry.username}:${registry.password}`).toString("base64");

    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      signal: ctrl.signal
    });
    clearTimeout(timer);

    if (res.status >= 200 && res.status < 400) {
      return { ok: true, latencyMs: Date.now() - started, message: "connected" };
    }

    return {
      ok: false,
      latencyMs: Date.now() - started,
      message: `http status ${res.status}`
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      message: err instanceof Error ? err.message : "request failed"
    };
  }
}
