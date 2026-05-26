import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("dashboard frontend static assets", () => {
  it("contains terminal UI shell, controls, and dashboard behavior hooks", async () => {
    const html = await readFile("web/templates/index.html", "utf8");
    const js = await readFile("web/static/app.js", "utf8");
    const css = await readFile("web/static/style.css", "utf8");

    expect(html).toMatch(/<main[^>]*class="(?=[^"]*\bpage\b)(?=[^"]*\bterminal-shell\b)[^"]*"/);
    expect(html).toContain('<span class="prompt-symbol">$</span>');
    expect(html).toMatch(/<section[^>]*class="(?=[^"]*\bterminal-controls\b)(?=[^"]*\bcontrols\b)[^"]*"/);
    expect(html).toContain('id="search"');
    expect(html).toContain('<span>search</span>');
    expect(html).not.toContain('id="repository-filter"');
    expect(html).not.toContain('id="registry-type"');
    expect(html).toContain('id="registry-filter"');
    expect(html).toContain('id="status-filter"');
    expect(html).not.toContain('id="view-mode"');
    expect(html).toContain('id="primary-name"');
    expect(html).not.toContain('id="secondary-name"');
    expect(html).toContain('id="theme-toggle"');

    expect(js).toContain('/api/dashboard');
    expect(js).toContain('setInterval(loadDashboard, 5000)');
    expect(js).toContain('navigator.clipboard.writeText');
    expect(js).toContain('localStorage.setItem("theme"');
    expect(js).toContain('repositoryParts(repo.name)');
    expect(js).not.toContain('state.repository');
    expect(js).not.toContain('renderRepositoryFilter');
    expect(js).toContain('state.registry');
    expect(js).toContain('renderRegistryFilter');
    expect(js).not.toContain('state.secondaryName');
    expect(js).not.toContain('state.registryType');
    expect(js).not.toContain('state.viewMode');
    expect(js).toMatch(/class="(?=[^"]*\bsummary-card\b)(?=[^"]*\bterminal-counter\b)[^"]*"/);
    expect(js).toContain('repo-prompt');
    expect(js).toContain('manifest-panel');
    expect(js).toContain('renderTagDetails');
    expect(js).toContain('tag-details');
    expect(js).toMatch(/tag-details[\s\S]*Details|Details[\s\S]*tag-details/);
    expect(js).toContain('renderLayers');
    expect(js).toContain('Layer Count');
    expect(js).toContain('layer-command');
    expect(js).toMatch(/layer-command[\s\S]*Show|Show[\s\S]*layer-command/);
    expect(js).toContain('formatBytes');
    expect(js).not.toMatch(/<th[^>]*>\s*Digest\s*<\/th>/);

    expect(css).toContain('body[data-theme="dark"]');
    expect(css).toContain('body[data-theme="light"]');
    expect(css).toContain('--terminal-green');
    expect(css).toContain('.terminal-shell');
    expect(css).toContain('.terminal-counter');
    expect(css).toContain('.layer-command-detail pre');
  });
});
