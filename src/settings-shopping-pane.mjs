export const SETTINGS_SECTIONS = Object.freeze([
  {
    id: "shopping",
    label: "Shopping",
    href: "#shopping",
  },
  {
    id: "privacy",
    label: "Privacy",
    href: "#privacy",
  },
]);

export const SHOPPING_SETUP_PLACEHOLDER =
  "Shopping preferences are in setup. Profile controls will appear here in a later milestone.";
export const SHOPPING_ACTIVITY_EMPTY_STATE =
  "No shopping activity has been recorded yet.";
export const CONNECTED_RETAILERS_EMPTY_STATE =
  "No retailers are connected yet.";

export function renderSettingsShoppingPane({ connectedRetailers = [], profile } = {}) {
  const profileState = profile ? "Profile data loaded." : "No shopping profile data yet.";
  const retailers = normalizeConnectedRetailers(connectedRetailers);
  const connectedRetailersContent =
    retailers.length === 0
      ? `<p class="settings-empty-state">${escapeHtml(CONNECTED_RETAILERS_EMPTY_STATE)}</p>`
      : [
          '<ul class="connected-retailers-list">',
          ...retailers.map((retailer) => renderConnectedRetailer(retailer)),
          "</ul>",
        ].join("\n    ");

  return [
    '<section id="shopping" class="settings-pane" aria-labelledby="shopping-heading">',
    '  <p class="settings-kicker">Settings</p>',
    '  <h1 id="shopping-heading">Shopping</h1>',
    `  <p class="settings-placeholder">${escapeHtml(SHOPPING_SETUP_PLACEHOLDER)}</p>`,
    `  <p class="settings-status">${escapeHtml(profileState)}</p>`,
    '  <section class="settings-subpane" aria-labelledby="connected-retailers-heading">',
    '    <h2 id="connected-retailers-heading">Connected retailers</h2>',
    "    " + connectedRetailersContent,
    "  </section>",
    "</section>",
  ].join("\n");
}

export function renderSettingsPrivacyPane({ auditEntries = [] } = {}) {
  const entries = Array.isArray(auditEntries) ? auditEntries : [];
  const activityState =
    entries.length === 0
      ? `<p class="settings-empty-state">${escapeHtml(SHOPPING_ACTIVITY_EMPTY_STATE)}</p>`
      : `<p class="settings-status">${escapeHtml(`${entries.length} shopping activity entries available.`)}</p>`;

  return [
    '<section id="privacy" class="settings-pane" aria-labelledby="privacy-heading">',
    '  <p class="settings-kicker">Settings</p>',
    '  <h1 id="privacy-heading">Privacy</h1>',
    '  <section class="settings-subpane" aria-labelledby="shopping-activity-heading">',
    '    <h2 id="shopping-activity-heading">Shopping activity</h2>',
    "    " + activityState,
    "  </section>",
    "</section>",
  ].join("\n");
}

export function renderSettingsApp({
  activeSection = "privacy",
  auditEntries,
  connectedRetailers,
  profile,
} = {}) {
  const active = SETTINGS_SECTIONS.some((section) => section.id === activeSection)
    ? activeSection
    : "privacy";

  return [
    '<main class="settings-shell" aria-label="Settings">',
    '  <aside class="settings-sidebar" aria-label="Settings sections">',
    "    <h2>Settings</h2>",
    '    <nav aria-label="Settings navigation">',
    ...SETTINGS_SECTIONS.map((section) => renderSettingsNavLink(section, active)),
    "    </nav>",
    "  </aside>",
    `  ${
      active === "shopping"
        ? renderSettingsShoppingPane({ connectedRetailers, profile }).replaceAll("\n", "\n  ")
        : renderSettingsPrivacyPane({ auditEntries }).replaceAll("\n", "\n  ")
    }`,
    "</main>",
  ].join("\n");
}

function renderSettingsNavLink(section, activeSection) {
  const current = section.id === activeSection ? ' aria-current="page"' : "";
  return `      <a href="${section.href}"${current}>${escapeHtml(section.label)}</a>`;
}

function renderConnectedRetailer(retailer) {
  return [
    '<li class="connected-retailer">',
    `  <span class="connected-retailer-name">${escapeHtml(retailer.label)}</span>`,
    `  <span class="connected-retailer-status">${escapeHtml(retailer.statusLabel)}</span>`,
    "</li>",
  ].join("\n      ");
}

function normalizeConnectedRetailers(connectedRetailers) {
  if (!Array.isArray(connectedRetailers)) {
    throw new TypeError("connectedRetailers must be an array.");
  }

  return connectedRetailers.map((retailer) => {
    if (!retailer || typeof retailer !== "object" || Array.isArray(retailer)) {
      throw new TypeError("connectedRetailers entries must be objects.");
    }

    return {
      label: normalizeString(retailer.label ?? retailer.retailerIdentifier, "retailer label"),
      statusLabel: normalizeString(retailer.statusLabel ?? retailer.status, "retailer status"),
    };
  });
}

function normalizeString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
