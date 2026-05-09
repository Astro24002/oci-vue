const tableBody = document.querySelector("#registryTable tbody");
const messageEl = document.getElementById("message");
const form = document.getElementById("registryForm");
const reloadBtn = document.getElementById("reloadBtn");

let registries = [];
let statuses = [];

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.style.color = isError ? "#b42318" : "#5b6b7c";
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) {
    const errorMessage = body?.error?.message ?? `request failed: ${res.status}`;
    throw new Error(errorMessage);
  }
  return body.data;
}

function mergeRows() {
  const byIdStatus = new Map(statuses.map((s) => [s.registryId, s]));
  return registries.map((registry) => {
    const status = byIdStatus.get(registry.id);
    return { registry, status };
  });
}

function fillForm(registry) {
  form.id.value = registry.id;
  form.name.value = registry.name;
  form.baseUrl.value = registry.baseUrl;
  form.username.value = registry.username;
  form.password.value = registry.password;
  form.intervalSec.value = registry.intervalSec ?? "";
  form.enabled.checked = registry.enabled;
}

async function disableRegistry(id) {
  try {
    await api(`/api/config/registries/${encodeURIComponent(id)}`, { method: "DELETE" });
    setMessage(`Disabled ${id}`);
    await loadData();
  } catch (err) {
    setMessage(err.message, true);
  }
}

async function testRegistry(registry) {
  try {
    const result = await api("/api/config/registries/test", {
      method: "POST",
      body: JSON.stringify(registry),
    });
    setMessage(
      `${registry.id}: ${result.ok ? "ok" : "failed"} (${result.latencyMs}ms) - ${result.message}`
    );
  } catch (err) {
    setMessage(err.message, true);
  }
}

function renderTable() {
  tableBody.innerHTML = "";
  for (const row of mergeRows()) {
    const tr = document.createElement("tr");
    const lastSync = row.status?.lastSyncAt ?? "-";
    const lastResult = row.status
      ? row.status.success
        ? "success"
        : row.status.errorMessage || "failed"
      : "-";

    tr.innerHTML = `
      <td>${row.registry.id}</td>
      <td>${row.registry.name}</td>
      <td>${row.registry.baseUrl}</td>
      <td>${row.registry.enabled ? "yes" : "no"}</td>
      <td>${lastSync}</td>
      <td>${lastResult}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="secondary" data-action="edit">Edit</button>
          <button type="button" class="secondary" data-action="test">Test</button>
          <button type="button" class="danger" data-action="disable">Disable</button>
        </div>
      </td>
    `;

    tr.querySelector('[data-action="edit"]').addEventListener("click", () => fillForm(row.registry));
    tr.querySelector('[data-action="test"]').addEventListener("click", () => testRegistry(row.registry));
    tr.querySelector('[data-action="disable"]').addEventListener("click", () =>
      disableRegistry(row.registry.id)
    );

    tableBody.appendChild(tr);
  }
}

async function loadData() {
  try {
    const [registryData, statusData] = await Promise.all([
      api("/api/config/registries"),
      api("/api/status/registries"),
    ]);
    registries = registryData;
    statuses = statusData;
    renderTable();
    if (!registries.length) {
      setMessage("No registries configured yet.");
    }
  } catch (err) {
    setMessage(err.message, true);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    id: form.id.value.trim(),
    name: form.name.value.trim(),
    baseUrl: form.baseUrl.value.trim(),
    username: form.username.value.trim(),
    password: form.password.value,
    intervalSec: form.intervalSec.value ? Number(form.intervalSec.value) : undefined,
    enabled: form.enabled.checked,
  };

  const exists = registries.some((r) => r.id === payload.id);
  const method = exists ? "PUT" : "POST";
  const url = exists
    ? `/api/config/registries/${encodeURIComponent(payload.id)}`
    : "/api/config/registries";

  const body = exists
    ? JSON.stringify({
        name: payload.name,
        baseUrl: payload.baseUrl,
        username: payload.username,
        password: payload.password,
        intervalSec: payload.intervalSec,
        enabled: payload.enabled,
      })
    : JSON.stringify(payload);

  try {
    await api(url, { method, body });
    setMessage(`${exists ? "Updated" : "Created"} ${payload.id}`);
    form.reset();
    form.enabled.checked = true;
    await loadData();
  } catch (err) {
    setMessage(err.message, true);
  }
});

reloadBtn.addEventListener("click", async () => {
  try {
    await api("/api/config/reload", { method: "POST", body: JSON.stringify({}) });
    setMessage("Config reloaded");
    await loadData();
  } catch (err) {
    setMessage(err.message, true);
  }
});

loadData();
