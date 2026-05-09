export const SETTINGS_SECTIONS = Object.freeze([
  {
    id: "shopping",
    label: "Shopping",
    href: "#shopping",
  },
]);

export const SHOPPING_SETUP_PLACEHOLDER =
  "Shopping preferences are in setup. Profile controls will appear here in a later milestone.";

export function renderSettingsShoppingPane({ profile } = {}) {
  const profileState = profile ? "Profile data loaded." : "No shopping profile data yet.";

  return [
    '<section id="shopping" class="settings-pane" aria-labelledby="shopping-heading">',
    '  <p class="settings-kicker">Settings</p>',
    '  <h1 id="shopping-heading">Shopping</h1>',
    `  <p class="settings-placeholder">${escapeHtml(SHOPPING_SETUP_PLACEHOLDER)}</p>`,
    `  <p class="settings-status">${escapeHtml(profileState)}</p>`,
    "</section>",
  ].join("\n");
}

export function renderSettingsApp({ activeSection = "shopping", profile } = {}) {
  const active = SETTINGS_SECTIONS.some((section) => section.id === activeSection)
    ? activeSection
    : "shopping";

  return [
    '<main class="settings-shell" aria-label="Settings">',
    '  <aside class="settings-sidebar" aria-label="Settings sections">',
    "    <h2>Settings</h2>",
    '    <nav aria-label="Settings navigation">',
    ...SETTINGS_SECTIONS.map((section) => renderSettingsNavLink(section, active)),
    "    </nav>",
    "  </aside>",
    `  ${renderSettingsShoppingPane({ profile }).replaceAll("\n", "\n  ")}`,
    "</main>",
  ].join("\n");
}

function renderSettingsNavLink(section, activeSection) {
  const current = section.id === activeSection ? ' aria-current="page"' : "";
  return `      <a href="${section.href}"${current}>${escapeHtml(section.label)}</a>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
