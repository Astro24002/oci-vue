const state = {
  dashboard: null,
  search: "",
  registry: "all",
  primaryName: "all",
  status: "all",
  theme: localStorage.getItem("theme") || "dark",
  expanded: new Set(),
  expandedTags: new Set(),
  expandedLayerCommands: new Set()
};

const el = (id) => document.getElementById(id);

function applyTheme() {
  document.body.dataset.theme = state.theme;
  el("theme-toggle").textContent = state.theme === "dark" ? "Light" : "Dark";
  el("theme-toggle").setAttribute("aria-pressed", String(state.theme === "dark"));
}

async function loadDashboard() {
  try {
    el("refresh-state").textContent = "Refreshing";
    const res = await fetch("/api/dashboard");
    const body = await res.json();
    if (!body.ok) throw new Error(body.error?.message || "refresh failed");
    state.dashboard = body.data;
    el("refresh-state").textContent = `Updated ${new Date(body.data.generatedAt).toLocaleTimeString()}`;
    renderRegistryFilter();
    renderNameFilters();
    render();
  } catch (err) {
    el("refresh-state").textContent = err instanceof Error ? err.message : "Refresh failed";
  }
}

function render() {
  if (!state.dashboard) return;
  renderSummary();
  renderErrors();
  renderRepositories();
}

function renderSummary() {
  const s = state.dashboard.summary;
  el("summary").innerHTML = [
    ["Registries", s.registries],
    ["Healthy", s.healthy],
    ["Degraded", s.degraded],
    ["Errors", s.error],
    ["Repositories", s.repositories],
    ["Tags", s.tags]
  ].map(([label, value]) => `<article class="summary-card terminal-counter"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderErrors() {
  const bad = state.dashboard.registries.filter((r) => r.status === "degraded" || r.status === "error");
  el("errors").innerHTML = bad.map((r) => `<div class="error-card"><strong>${escapeHtml(r.registryName)}</strong>: ${escapeHtml(r.lastErrorMessage || r.status)}</div>`).join("");
}

function flattenedRepositories() {
  return state.dashboard.registries.flatMap((registry) =>
    registry.repositories.map((repo) => ({ registry, repo }))
  ).filter(({ registry, repo }) => {
    const [primaryName] = repositoryParts(repo.name);
    const matchesSearch = repo.name.toLowerCase().includes(state.search.toLowerCase());
    const matchesRegistry = state.registry === "all" || registry.registryName === state.registry;
    const matchesPrimary = state.primaryName === "all" || primaryName === state.primaryName;
    const matchesStatus = state.status === "all" || registry.status === state.status;
    return matchesSearch && matchesRegistry && matchesPrimary && matchesStatus;
  });
}

function renderRegistryFilter() {
  if (!state.dashboard) return;
  const registries = uniqueSorted(state.dashboard.registries.map((registry) => registry.registryName));
  if (state.registry !== "all" && !registries.includes(state.registry)) {
    state.registry = "all";
  }
  fillSelect(el("registry-filter"), "All registries", registries, state.registry);
}

function renderNameFilters() {
  if (!state.dashboard) return;
  const rows = state.dashboard.registries.flatMap((registry) => registry.repositories.map((repo) => repo.name));
  const primaryNames = uniqueSorted(rows.map((name) => repositoryParts(name)[0]).filter(Boolean));
  fillSelect(el("primary-name"), "All primary names", primaryNames, state.primaryName);
}

function fillSelect(select, allLabel, values, selected) {
  select.innerHTML = [`<option value="all">${allLabel}</option>`, ...values.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`)].join("");
  select.value = values.includes(selected) ? selected : "all";
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function repositoryParts(name) {
  const parts = String(name).split("/");
  return [parts[0] || "", parts[1] || ""];
}

function renderRepositories() {
  const rows = flattenedRepositories();
  el("repository-list").innerHTML = rows.map(renderRepositoryCard).join("") || `<div class="empty">No repositories found.</div>`;
  bindRepositoryButtons();
}

function renderRepositoryCard({ registry, repo }) {
  const key = `${registry.registryId}::${repo.name}`;
  const expanded = state.expanded.has(key);
  return `
    <article class="repo-card status-${registry.status}">
      <div class="repo-main">
        <div>
          <div class="repo-name"><span class="repo-prompt">&gt;</span>${escapeHtml(repo.name)}</div>
          <div class="repo-meta">${escapeHtml(registry.registryName)} · ${escapeHtml(registry.registryType)} · ${escapeHtml(registry.status)}</div>
        </div>
        <div class="repo-actions">
          <span class="tag-count">${repo.tagCount} tags</span>
          <button class="expand" data-key="${escapeAttr(key)}" aria-label="${expanded ? "Collapse" : "Expand"} repository ${escapeAttr(repo.name)}">${expanded ? "Collapse" : "Expand"}</button>
        </div>
      </div>
      ${expanded ? renderTags(repo.tags) : ""}
    </article>
  `;
}

function renderTags(tags) {
  return `<div class="tag-panel"><table><thead><tr><th>Image Ref</th><th>Tag</th><th>Updated</th><th>Copy</th><th>Details</th></tr></thead><tbody>${tags.map((tag) => {
    const detailKey = tag.imageRef;
    const expanded = state.expandedTags.has(detailKey);
    return `
    <tr>
      <td><code>${escapeHtml(tag.imageRef)}</code></td>
      <td>${escapeHtml(tag.tag)}</td>
      <td>${formatDate(tag.updatedAt || tag.createdAt)}</td>
      <td><button class="copy" data-ref="${escapeAttr(tag.imageRef)}" aria-label="Copy image ref ${escapeAttr(tag.imageRef)}">Copy</button></td>
      <td><button class="tag-details" data-key="${escapeAttr(detailKey)}" aria-label="${expanded ? "Hide" : "Show"} details for ${escapeAttr(tag.imageRef || tag.tag)}">${expanded ? "Hide" : "Details"}</button></td>
    </tr>
    ${expanded ? renderTagDetails(tag) : ""}
  `;
  }).join("")}</tbody></table></div>`;
}

function renderTagDetails(tag) {
  return `<tr class="tag-detail-row"><td colspan="5">
    <section class="manifest-panel">
      <h3>manifest</h3>
      <dl class="tag-detail-grid">
        <div><dt>Image Ref</dt><dd><code>${escapeHtml(tag.imageRef)}</code></dd></div>
        <div><dt>Tag</dt><dd>${escapeHtml(tag.tag)}</dd></div>
        <div><dt>Digest</dt><dd><code>${escapeHtml(tag.digest || "-")}</code></dd></div>
        <div><dt>Created</dt><dd>${formatDate(tag.createdAt)}</dd></div>
        <div><dt>Updated</dt><dd>${formatDate(tag.updatedAt || tag.createdAt)}</dd></div>
        <div><dt>Total Size</dt><dd>${formatBytes(tag.sizeBytes)}</dd></div>
        <div><dt>Layer Count</dt><dd>${Array.isArray(tag.layers) ? tag.layers.length : 0}</dd></div>
      </dl>
      ${renderLayers(tag.layers, tag.imageRef)}
    </section>
  </td></tr>`;
}

function renderLayers(layers, tagKey = "") {
  if (!Array.isArray(layers) || layers.length === 0) {
    return `<div class="empty layers-empty">No layers available.</div>`;
  }
  return `<section class="layers-section">
    <h3>layers</h3>
    <table class="layers-table"><thead><tr><th>#</th><th>Media Type</th><th>Size</th><th>SHA</th><th>Command</th></tr></thead><tbody>${layers.map((layer, index) => {
      const commandKey = `${tagKey}::${layer.digest || index}::${index}`;
      const commandExpanded = state.expandedLayerCommands.has(commandKey);
      return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(layer.mediaType || "-")}</td>
        <td>${formatBytes(layer.sizeBytes)}</td>
        <td><code>${escapeHtml(layer.digest || "-")}</code></td>
        <td>${layer.command ? `<button class="layer-command" data-key="${escapeAttr(commandKey)}" aria-label="${commandExpanded ? "Hide" : "Show"} command for layer ${index + 1}">${commandExpanded ? "Hide" : "Show"}</button>` : "-"}</td>
      </tr>
      ${commandExpanded ? renderLayerCommand(layer) : ""}
    `;
    }).join("")}</tbody></table>
  </section>`;
}

function renderLayerCommand(layer) {
  return `<tr class="layer-command-row"><td colspan="5">
    <div class="layer-command-detail">
      <div><strong>Command</strong><pre>${escapeHtml(layer.command || "-")}</pre></div>
      <div><strong>Created</strong> ${formatDate(layer.createdAt)}</div>
      ${layer.comment ? `<div><strong>Comment</strong> ${escapeHtml(layer.comment)}</div>` : ""}
    </div>
  </td></tr>`;
}

function formatBytes(value) {
  if (!Number.isFinite(value)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function bindRepositoryButtons() {
  document.querySelectorAll(".expand").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      if (state.expanded.has(key)) state.expanded.delete(key);
      else state.expanded.add(key);
      renderRepositories();
    });
  });
  document.querySelectorAll(".copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await navigator.clipboard.writeText(btn.dataset.ref);
      btn.textContent = "Copied";
      setTimeout(() => { btn.textContent = "Copy"; }, 1200);
    });
  });
  document.querySelectorAll(".tag-details").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      if (state.expandedTags.has(key)) state.expandedTags.delete(key);
      else state.expandedTags.add(key);
      renderRepositories();
    });
  });
  document.querySelectorAll(".layer-command").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      if (state.expandedLayerCommands.has(key)) state.expandedLayerCommands.delete(key);
      else state.expandedLayerCommands.add(key);
      renderRepositories();
    });
  });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[ch]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}

el("search").addEventListener("input", (event) => {
  state.search = event.target.value;
  renderRepositories();
});
el("registry-filter").addEventListener("change", (event) => {
  state.registry = event.target.value;
  renderRepositories();
});
el("primary-name").addEventListener("change", (event) => {
  state.primaryName = event.target.value;
  renderNameFilters();
  renderRepositories();
});
el("status-filter").addEventListener("change", (event) => {
  state.status = event.target.value;
  renderRepositories();
});
el("manual-refresh").addEventListener("click", loadDashboard);
el("theme-toggle").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", state.theme);
  applyTheme();
});

applyTheme();
loadDashboard();
setInterval(loadDashboard, 5000);
