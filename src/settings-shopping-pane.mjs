import {
  createDefaultShoppingProfile,
  readShoppingProfile,
  writeShoppingProfile,
} from "./shopping-profile.mjs";

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
  {
    id: "memories",
    label: "Memories",
    href: "#memories",
  },
]);

export const SHOPPING_MEMORY_FILTER_LABEL = "Shopping";
export const SHOPPING_SETUP_PLACEHOLDER =
  "Shopping preferences are in setup. Profile controls will appear here in a later milestone.";
export const SHOPPING_ACTIVITY_EMPTY_STATE =
  "No shopping activity has been recorded yet.";
export const CONNECTED_RETAILERS_EMPTY_STATE =
  "No retailers are connected yet.";

export const DEFAULT_GARMENT_CLASSES = Object.freeze([
  "tops",
  "bottoms",
  "outerwear",
  "shoes",
  "underwear",
  "accessories",
]);

export const DEFAULT_RETAILERS = Object.freeze([
  "Asket",
  "Zalando",
  "ASOS",
  "About You",
  "H&M.lv",
  "Uniqlo",
]);

export function renderSettingsShoppingPane({ connectedRetailers = [], profile, proposalCards = [] } = {}) {
  const normalizedProfile = createDefaultShoppingProfile(profile ?? {});
  const profileState = profile ? "Profile data loaded." : "Using default shopping profile values.";
  const retailers = normalizeConnectedRetailers(connectedRetailers);
  const proposals = normalizeProposalCards(proposalCards);
  const connectedRetailersContent =
    retailers.length === 0
      ? `<p class="settings-empty-state">${escapeHtml(CONNECTED_RETAILERS_EMPTY_STATE)}</p>`
      : [
          '<ul class="connected-retailers-list">',
          ...retailers.map((retailer) => renderConnectedRetailer(retailer)),
          "</ul>",
        ].join("\n    ");
  const proposalCardsContent =
    proposals.length === 0
      ? ""
      : [
          '  <section class="proposal-cards" aria-labelledby="retailer-proposals-heading">',
          '    <h2 id="retailer-proposals-heading">Retailer proposals</h2>',
          ...proposals.map((proposal) => renderNormalizedRetailerProposalCard(proposal)),
          "  </section>",
        ].join("\n");

  return [
    '<section id="shopping" class="settings-pane" aria-labelledby="shopping-heading">',
    '  <p class="settings-kicker">Settings</p>',
    '  <h1 id="shopping-heading">Shopping</h1>',
    `  <p class="settings-status">${escapeHtml(profileState)}</p>`,
    renderShoppingProfileEditor(normalizedProfile),
    '  <section class="settings-subpane" aria-labelledby="connected-retailers-heading">',
    '    <h2 id="connected-retailers-heading">Connected retailers</h2>',
    "    " + connectedRetailersContent,
    "  </section>",
    proposalCardsContent,
    "</section>",
  ].filter(Boolean).join("\n");
}

export async function persistSettingsShoppingProfileChange(change = {}, { profilePath } = {}) {
  if (!change || typeof change !== "object" || Array.isArray(change)) {
    throw new TypeError("settings profile change must be an object.");
  }

  const profile = await readShoppingProfile(profilePath);
  const next = {
    ...profile,
    sizes: { ...profile.sizes },
    budgetAnchors: { ...profile.budgetAnchors },
    hardExclusions: [...profile.hardExclusions],
    enabledRetailers: [...profile.enabledRetailers],
  };

  switch (change.field) {
    case "country":
    case "currency":
      next[change.field] = normalizeString(change.value, change.field);
      break;
    case "size":
      applySizeChange(next, change);
      break;
    case "budgetAnchor":
      applyBudgetAnchorChange(next, change);
      break;
    case "hardExclusions":
      next.hardExclusions = normalizeSettingsList(change.value, "hardExclusions");
      break;
    case "perItemPriceCeiling":
      next.perItemPriceCeiling = normalizeSettingsMoney(change.value, "perItemPriceCeiling");
      break;
    case "enabledRetailer":
      applyEnabledRetailerChange(next, change);
      break;
    default:
      throw new TypeError("settings profile change field is not supported.");
  }

  return writeShoppingProfile(next, profilePath);
}

function renderShoppingProfileEditor(profile) {
  return [
    '  <form class="shopping-profile-editor" data-shopping-profile-editor>',
    '    <section class="settings-subpane" aria-labelledby="shopping-region-heading">',
    '      <h2 id="shopping-region-heading">Shopping region</h2>',
    '      <div class="settings-field-grid settings-field-grid--compact">',
    renderTextField({
      id: "shopping-country",
      label: "Country",
      name: "country",
      value: profile.country,
      maxLength: 2,
      pattern: "[A-Za-z]{2}",
      autocomplete: "country",
    }),
    renderTextField({
      id: "shopping-currency",
      label: "Currency",
      name: "currency",
      value: profile.currency,
      maxLength: 3,
      pattern: "[A-Za-z]{3}",
    }),
    "      </div>",
    "    </section>",
    '    <section class="settings-subpane" aria-labelledby="shopping-sizes-heading">',
    '      <h2 id="shopping-sizes-heading">Sizes</h2>',
    '      <div class="shopping-profile-table" role="table" aria-label="Garment sizes">',
    '        <div class="shopping-profile-row shopping-profile-row--head" role="row">',
    '          <span role="columnheader">Class</span>',
    '          <span role="columnheader">Size</span>',
    '          <span role="columnheader">System</span>',
    '          <span role="columnheader">Notes</span>',
    "        </div>",
    ...getProfileKeys(profile.sizes).map((garmentClass) => renderSizeRow(garmentClass, profile.sizes[garmentClass])),
    "      </div>",
    "    </section>",
    '    <section class="settings-subpane" aria-labelledby="shopping-budget-heading">',
    '      <h2 id="shopping-budget-heading">Budget anchors</h2>',
    '      <div class="shopping-profile-table" role="table" aria-label="Budget anchors by garment class">',
    '        <div class="shopping-profile-row shopping-profile-row--head shopping-profile-row--budget" role="row">',
    '          <span role="columnheader">Class</span>',
    '          <span role="columnheader">Amount</span>',
    '          <span role="columnheader">Currency</span>',
    '          <span role="columnheader">Cadence</span>',
    '          <span role="columnheader">Notes</span>',
    "        </div>",
    ...getProfileKeys(profile.budgetAnchors).map((garmentClass) =>
      renderBudgetRow(garmentClass, profile.budgetAnchors[garmentClass], profile.currency),
    ),
    "      </div>",
    "    </section>",
    '    <section class="settings-subpane" aria-labelledby="shopping-limits-heading">',
    '      <h2 id="shopping-limits-heading">Limits and exclusions</h2>',
    '      <div class="settings-field-grid settings-field-grid--compact">',
    renderNumberField({
      id: "shopping-price-ceiling-amount",
      label: "Per-item ceiling",
      name: "perItemPriceCeiling.amount",
      value: profile.perItemPriceCeiling.amount,
    }),
    renderTextField({
      id: "shopping-price-ceiling-currency",
      label: "Ceiling currency",
      name: "perItemPriceCeiling.currency",
      value: profile.perItemPriceCeiling.currency,
      maxLength: 3,
      pattern: "[A-Za-z]{3}",
    }),
    "      </div>",
    '      <label class="settings-field settings-field--wide" for="shopping-hard-exclusions">',
    "        <span>Hard exclusions</span>",
    `        <textarea id="shopping-hard-exclusions" name="hardExclusions" rows="3" data-profile-field="hardExclusions">${escapeHtml(profile.hardExclusions.join("\n"))}</textarea>`,
    "      </label>",
    "    </section>",
    '    <section class="settings-subpane" aria-labelledby="shopping-enabled-retailers-heading">',
    '      <h2 id="shopping-enabled-retailers-heading">Enabled retailers</h2>',
    '      <ul class="enabled-retailers-list">',
    ...DEFAULT_RETAILERS.map((retailer) => renderRetailerToggle(retailer, profile.enabledRetailers.includes(retailer))),
    "      </ul>",
    "    </section>",
    "  </form>",
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

export function renderSettingsMemoriesPane({ memories = [], activeFilter = SHOPPING_MEMORY_FILTER_LABEL } = {}) {
  const normalizedMemories = normalizeMemories(memories);
  const filter = normalizeString(activeFilter, "active memory filter");
  const filteredMemories = normalizedMemories.filter((memory) => memory.tags.includes(filter));
  const memoryContent =
    filteredMemories.length === 0
      ? `<p class="settings-empty-state">No ${escapeHtml(filter)} memories yet.</p>`
      : [
          '<div class="settings-memory-list" role="list" tabindex="0" aria-label="Shopping memories" style="max-height: 28rem; overflow-y: auto;">',
          ...filteredMemories.map((memory) => renderMemoryItem(memory)),
          "</div>",
        ].join("\n    ");

  return [
    '<section id="memories" class="settings-pane" aria-labelledby="memories-heading">',
    '  <p class="settings-kicker">Settings</p>',
    '  <h1 id="memories-heading">Memories</h1>',
    '  <section class="settings-subpane" aria-labelledby="memory-filters-heading">',
    '    <h2 id="memory-filters-heading">Memory filters</h2>',
    '    <div class="settings-filter-row" role="group" aria-label="Memory filters">',
    `      <button type="button" class="settings-filter" aria-pressed="true">${escapeHtml(filter)}</button>`,
    '    </div>',
    '  </section>',
    '  <section class="settings-subpane" aria-labelledby="shopping-memories-heading">',
    '    <header class="settings-subpane-header">',
    '      <h2 id="shopping-memories-heading">Shopping memories</h2>',
    '      <button type="button" class="memory-clear-shopping-button">Clear shopping memories</button>',
    '    </header>',
    "    " + memoryContent,
    "  </section>",
    "</section>",
  ].join("\n");
}

export function renderSettingsApp({
  activeSection = "privacy",
  auditEntries,
  connectedRetailers,
  memories,
  memoryFilter,
  profile,
  proposalCards,
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
    `  ${renderActiveSettingsPane({
      active,
      auditEntries,
      connectedRetailers,
      memories,
      memoryFilter,
      profile,
      proposalCards,
    }).replaceAll("\n", "\n  ")}`,
    "</main>",
  ].join("\n");
}

function renderTextField({ id, label, name, value, maxLength, pattern, autocomplete }) {
  const attributes = [
    `id="${escapeHtml(id)}"`,
    `name="${escapeHtml(name)}"`,
    'type="text"',
    `value="${escapeHtml(value)}"`,
    `data-profile-field="${escapeHtml(name)}"`,
    maxLength ? `maxlength="${escapeHtml(maxLength)}"` : "",
    pattern ? `pattern="${escapeHtml(pattern)}"` : "",
    autocomplete ? `autocomplete="${escapeHtml(autocomplete)}"` : "",
  ].filter(Boolean).join(" ");

  return [
    `        <label class="settings-field" for="${escapeHtml(id)}">`,
    `          <span>${escapeHtml(label)}</span>`,
    `          <input ${attributes}>`,
    "        </label>",
  ].join("\n");
}

function renderNumberField({ id, label, name, value }) {
  return [
    `        <label class="settings-field" for="${escapeHtml(id)}">`,
    `          <span>${escapeHtml(label)}</span>`,
    `          <input id="${escapeHtml(id)}" name="${escapeHtml(name)}" type="number" min="0" step="0.01" value="${escapeHtml(value)}" data-profile-field="${escapeHtml(name)}">`,
    "        </label>",
  ].join("\n");
}

function renderSizeRow(garmentClass, size) {
  const baseName = `sizes.${garmentClass}`;
  return [
    '        <div class="shopping-profile-row" role="row">',
    `          <strong role="rowheader">${escapeHtml(formatGarmentClass(garmentClass))}</strong>`,
    renderInlineInput(`${baseName}.value`, size?.value ?? "", "Size"),
    renderInlineInput(`${baseName}.system`, size?.system ?? "", "System"),
    renderInlineInput(`${baseName}.notes`, size?.notes ?? "", "Notes"),
    "        </div>",
  ].join("\n");
}

function renderBudgetRow(garmentClass, budgetAnchor, defaultCurrency) {
  const baseName = `budgetAnchors.${garmentClass}`;
  return [
    '        <div class="shopping-profile-row shopping-profile-row--budget" role="row">',
    `          <strong role="rowheader">${escapeHtml(formatGarmentClass(garmentClass))}</strong>`,
    renderInlineInput(`${baseName}.amount`, budgetAnchor?.amount ?? 0, "Amount", "number"),
    renderInlineInput(`${baseName}.currency`, budgetAnchor?.currency ?? defaultCurrency, "Currency"),
    renderCadenceSelect(`${baseName}.cadence`, budgetAnchor?.cadence ?? "per_item"),
    renderInlineInput(`${baseName}.notes`, budgetAnchor?.notes ?? "", "Notes"),
    "        </div>",
  ].join("\n");
}

function renderInlineInput(name, value, label, type = "text") {
  const id = normalizeId(`shopping-${name}`);
  const numericAttributes = type === "number" ? ' min="0" step="0.01"' : "";
  return [
    `          <label class="shopping-profile-inline-field" for="${escapeHtml(id)}">`,
    `            <span>${escapeHtml(label)}</span>`,
    `            <input id="${escapeHtml(id)}" name="${escapeHtml(name)}" type="${escapeHtml(type)}"${numericAttributes} value="${escapeHtml(value)}" data-profile-field="${escapeHtml(name)}">`,
    "          </label>",
  ].join("\n");
}

function renderCadenceSelect(name, value) {
  const id = normalizeId(`shopping-${name}`);
  const options = ["per_item", "monthly", "seasonal", "annual"];
  return [
    `          <label class="shopping-profile-inline-field" for="${escapeHtml(id)}">`,
    "            <span>Cadence</span>",
    `            <select id="${escapeHtml(id)}" name="${escapeHtml(name)}" data-profile-field="${escapeHtml(name)}">`,
    ...options.map((option) => {
      const selected = option === value ? " selected" : "";
      return `              <option value="${escapeHtml(option)}"${selected}>${escapeHtml(option.replaceAll("_", " "))}</option>`;
    }),
    "            </select>",
    "          </label>",
  ].join("\n");
}

function renderRetailerToggle(retailer, enabled) {
  const checked = enabled ? " checked" : "";
  const id = normalizeId(`shopping-retailer-${retailer}`);
  return [
    '        <li class="enabled-retailer">',
    `          <label for="${escapeHtml(id)}">`,
    `            <input id="${escapeHtml(id)}" name="enabledRetailers" type="checkbox" value="${escapeHtml(retailer)}" data-profile-field="enabledRetailers" data-retailer="${escapeHtml(retailer)}"${checked}>`,
    `            <span>${escapeHtml(retailer)}</span>`,
    "          </label>",
    "        </li>",
  ].join("\n");
}

function renderActiveSettingsPane({
  active,
  auditEntries,
  connectedRetailers,
  memories,
  memoryFilter,
  profile,
  proposalCards,
}) {
  if (active === "shopping") {
    return renderSettingsShoppingPane({ connectedRetailers, profile, proposalCards });
  }
  if (active === "memories") {
    return renderSettingsMemoriesPane({ memories, activeFilter: memoryFilter });
  }
  return renderSettingsPrivacyPane({ auditEntries });
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

function renderMemoryItem(memory) {
  const pinned = memory.pinned ? "true" : "false";
  const tags = memory.tags.map((tag) => `<span class="memory-tag">${escapeHtml(tag)}</span>`).join("");
  return [
    `      <article class="settings-memory${memory.pinned ? " settings-memory--pinned" : ""}" role="listitem" data-memory-id="${escapeHtml(memory.id)}">`,
    '        <header class="settings-memory-header">',
    "          <div>",
    `            <p class="settings-memory-meta">${escapeHtml(memory.sentiment)} &middot; ${escapeHtml(memory.timestamp)}</p>`,
    `            <h3>${escapeHtml(memory.content)}</h3>`,
    "          </div>",
    `          <button type="button" class="memory-pin-button" aria-pressed="${pinned}">${memory.pinned ? "Unpin" : "Pin"}</button>`,
    "        </header>",
    memory.subject ? renderMemorySubject(memory.subject) : "",
    `        <div class="settings-memory-tags">${tags}</div>`,
    '        <footer class="settings-memory-actions">',
    '          <button type="button" class="memory-edit-button">Edit</button>',
    '          <button type="button" class="memory-wipe-button">Wipe</button>',
    "        </footer>",
    "      </article>",
  ].filter(Boolean).join("\n");
}

function renderMemorySubject(subject) {
  const summary = [subject.brand, subject.title, subject.color, subject.size].filter(Boolean).join(" / ");
  if (!summary) {
    return "";
  }
  return `        <p class="settings-memory-subject">${escapeHtml(summary)}</p>`;
}

export function renderRetailerProposalCard(proposal) {
  return renderNormalizedRetailerProposalCard(normalizeProposalCard(proposal));
}

function renderNormalizedRetailerProposalCard(proposal) {
  const selectedCount = countSelectedCandidates(proposal.candidates);
  const isStaged = proposal.staged;
  const hasFailure = Boolean(proposal.failure);
  const buttonDisabled = selectedCount === 0 || isStaged || hasFailure ? " disabled" : "";
  const selectedLabel = `${selectedCount} selected`;

  if (hasFailure) {
    return renderProposalFailureCard(proposal, selectedLabel, buttonDisabled);
  }

  return [
    `    <article class="proposal-card${isStaged ? " proposal-card--staged" : ""}" aria-label="${escapeHtml(proposal.retailer)} proposal">`,
    '      <header class="proposal-card-header">',
    "        <div>",
    `          <h3>${escapeHtml(proposal.retailer)}</h3>`,
    `          <p>${escapeHtml(selectedLabel)}</p>`,
    "        </div>",
    isStaged
      ? `        <a class="proposal-cart-link" href="${escapeHtml(proposal.cartUrl)}" target="_blank" rel="noreferrer">Open cart</a>`
      : "",
    "      </header>",
    isStaged
      ? renderStagedProposalResult(proposal, selectedCount)
      : renderProposalCandidates(proposal.candidates),
    '      <footer class="proposal-card-footer">',
    `        <span>ETA: ${escapeHtml(proposal.eta)}</span>`,
    `        <span>Returns: ${escapeHtml(proposal.returnPolicy)}</span>`,
    `        <button type="button" class="proposal-stage-button"${buttonDisabled}>Stage selected to ${escapeHtml(proposal.retailer)} cart</button>`,
    "      </footer>",
    "    </article>",
  ].filter(Boolean).join("\n");
}

function renderProposalFailureCard(proposal, selectedLabel, buttonDisabled) {
  return [
    `    <article class="proposal-card proposal-card--failed" aria-label="${escapeHtml(proposal.retailer)} staging failure">`,
    '      <header class="proposal-card-header">',
    "        <div>",
    `          <h3>${escapeHtml(proposal.retailer)}</h3>`,
    `          <p>${escapeHtml(selectedLabel)}</p>`,
    "        </div>",
    `        <a class="proposal-cart-link" href="${escapeHtml(proposal.failure.manualUrl)}" target="_blank" rel="noreferrer">Open in ${escapeHtml(proposal.retailer)} to complete manually</a>`,
    "      </header>",
    '      <div class="proposal-failure-result" role="alert">',
    `        <strong>${escapeHtml(proposal.failure.explanation)}</strong>`,
    "      </div>",
    '      <footer class="proposal-card-footer">',
    `        <span>ETA: ${escapeHtml(proposal.eta)}</span>`,
    `        <span>Returns: ${escapeHtml(proposal.returnPolicy)}</span>`,
    `        <button type="button" class="proposal-stage-button"${buttonDisabled}>Stage selected to ${escapeHtml(proposal.retailer)} cart</button>`,
    "      </footer>",
    "    </article>",
  ].join("\n");
}

function renderProposalCandidates(candidates) {
  if (candidates.length === 0) {
    return '      <p class="settings-empty-state">No candidates are available for this retailer.</p>';
  }

  return [
    '      <ul class="proposal-candidate-list">',
    ...candidates.map((candidate, index) => renderProposalCandidate(candidate, index)),
    "      </ul>",
  ].join("\n");
}

function renderProposalCandidate(candidate, index) {
  const checked = candidate.selected ? " checked" : "";
  const candidateId = `${candidate.id}-${index}`;

  return [
    '        <li class="proposal-candidate">',
    `          <label class="proposal-candidate-select" for="${escapeHtml(candidateId)}">`,
    `            <input id="${escapeHtml(candidateId)}" name="${escapeHtml(candidate.id)}" type="checkbox"${checked}>`,
    '            <span class="proposal-candidate-check" aria-hidden="true"></span>',
    "          </label>",
    `          <img src="${escapeHtml(candidate.imageUrl)}" alt="${escapeHtml(candidate.imageAlt)}" loading="lazy">`,
    '          <div class="proposal-candidate-body">',
    `            <p class="proposal-candidate-brand">${escapeHtml(candidate.brand)}</p>`,
    `            <h4>${escapeHtml(candidate.title)}</h4>`,
    `            <p class="proposal-candidate-meta">${escapeHtml(candidate.size)} &middot; ${escapeHtml(candidate.color)} &middot; ${escapeHtml(candidate.price)}</p>`,
    `            <p class="proposal-candidate-reason">${escapeHtml(candidate.reasoning)}</p>`,
    "          </div>",
    `          <a class="proposal-product-link" href="${escapeHtml(candidate.productUrl)}" target="_blank" rel="noreferrer">Open product</a>`,
    "        </li>",
  ].join("\n");
}

function renderStagedProposalResult(proposal, selectedCount) {
  const stagedCount = proposal.stagedCount ?? selectedCount;
  return [
    '      <div class="proposal-staged-result" role="status">',
    `        <strong>${escapeHtml(stagedCount)} staged</strong>`,
    `        <span>${escapeHtml(proposal.retailer)} cart is ready for review.</span>`,
    "      </div>",
  ].join("\n");
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

function normalizeProposalCards(proposalCards) {
  if (!Array.isArray(proposalCards)) {
    throw new TypeError("proposalCards must be an array.");
  }

  return proposalCards.map((proposal) => normalizeProposalCard(proposal));
}

function normalizeMemories(memories) {
  if (!Array.isArray(memories)) {
    throw new TypeError("memories must be an array.");
  }
  return memories.map((memory, index) => {
    if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
      throw new TypeError(`memories[${index}] must be an object.`);
    }
    return {
      id: normalizeString(memory.id, `memories[${index}].id`),
      content: normalizeString(memory.content ?? memory.text, `memories[${index}].content`),
      pinned: Boolean(memory.pinned),
      sentiment: normalizeString(memory.sentiment ?? "neutral", `memories[${index}].sentiment`),
      subject: normalizeOptionalSubject(memory.subject, `memories[${index}].subject`),
      tags: normalizeTags(memory.tags, `memories[${index}].tags`),
      timestamp: normalizeString(memory.timestamp, `memories[${index}].timestamp`),
    };
  }).sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.timestamp.localeCompare(left.timestamp));
}

function normalizeTags(tags, field) {
  if (!Array.isArray(tags)) {
    throw new TypeError(`${field} must be an array.`);
  }
  return tags.map((tag) => normalizeString(tag, field));
}

function normalizeOptionalSubject(subject, field) {
  if (subject === undefined) {
    return undefined;
  }
  if (!subject || typeof subject !== "object" || Array.isArray(subject)) {
    throw new TypeError(`${field} must be an object.`);
  }
  const normalized = {};
  for (const key of ["brand", "title", "color", "size", "productUrl", "retailer", "category"]) {
    if (subject[key] !== undefined) {
      normalized[key] = normalizeString(subject[key], `${field}.${key}`);
    }
  }
  return normalized;
}

function normalizeProposalCard(proposal) {
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    throw new TypeError("proposalCards entries must be objects.");
  }

  const candidates = normalizeProposalCandidates(proposal.candidates ?? []);
  const hasSelectedCandidate = candidates.some((candidate) => candidate.selected);
  const candidatesWithSelection =
    hasSelectedCandidate || candidates.length === 0
      ? candidates
      : candidates.map((candidate, index) => ({
          ...candidate,
          selected: index === 0,
        }));

  return {
    retailer: normalizeString(proposal.retailer ?? proposal.retailerName, "proposal retailer"),
    eta: normalizeString(proposal.eta, "proposal ETA"),
    returnPolicy: normalizeString(proposal.returnPolicy, "proposal return policy"),
    cartUrl: normalizeString(proposal.cartUrl, "proposal cart URL"),
    candidates: candidatesWithSelection,
    failure: normalizeProposalFailure(proposal),
    staged: normalizeStagedState(proposal),
    stagedCount:
      proposal.stagedCount === undefined ? undefined : normalizeNonNegativeInteger(proposal.stagedCount, "staged count"),
  };
}

function normalizeProposalCandidates(candidates) {
  if (!Array.isArray(candidates)) {
    throw new TypeError("proposal candidates must be an array.");
  }

  return candidates.slice(0, 3).map((candidate, index) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      throw new TypeError("proposal candidate entries must be objects.");
    }

    const title = normalizeString(candidate.title, "candidate title");
    return {
      id: normalizeId(candidate.id ?? `${candidate.brand ?? "candidate"}-${index}`),
      imageUrl: normalizeString(candidate.imageUrl, "candidate image URL"),
      imageAlt: normalizeString(candidate.imageAlt ?? title, "candidate image alt"),
      brand: normalizeString(candidate.brand, "candidate brand"),
      title,
      size: normalizeString(candidate.size, "candidate size"),
      color: normalizeString(candidate.color, "candidate color"),
      price: normalizeString(candidate.price, "candidate price"),
      reasoning: normalizeString(candidate.reasoning, "candidate reasoning"),
      productUrl: normalizeString(candidate.productUrl, "candidate product URL"),
      selected: Boolean(candidate.selected),
    };
  });
}

function applySizeChange(profile, change) {
  const garmentClass = normalizeGarmentClass(change.garmentClass);
  const size = normalizeSettingsSize(change.value);

  if (!size) {
    delete profile.sizes[garmentClass];
    return;
  }

  profile.sizes[garmentClass] = size;
}

function applyBudgetAnchorChange(profile, change) {
  const garmentClass = normalizeGarmentClass(change.garmentClass);
  const budgetAnchor = normalizeSettingsBudgetAnchor(change.value);

  if (!budgetAnchor) {
    delete profile.budgetAnchors[garmentClass];
    return;
  }

  profile.budgetAnchors[garmentClass] = budgetAnchor;
}

function applyEnabledRetailerChange(profile, change) {
  const retailer = normalizeString(change.retailer ?? change.value, "retailer");
  const enabled = Boolean(change.enabled);
  const current = new Set(profile.enabledRetailers);

  if (enabled) {
    current.add(retailer);
  } else {
    current.delete(retailer);
  }

  profile.enabledRetailers = [...current];
}

function getProfileKeys(record) {
  return [...new Set([...DEFAULT_GARMENT_CLASSES, ...Object.keys(record)])];
}

function formatGarmentClass(value) {
  return value
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeGarmentClass(value) {
  return normalizeString(value, "garmentClass");
}

function normalizeSettingsSize(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("size change value must be an object.");
  }

  const sizeValue = typeof value.value === "string" ? value.value.trim() : "";
  const system = typeof value.system === "string" ? value.system.trim() : "";
  const notes = typeof value.notes === "string" ? value.notes.trim() : "";

  if (!sizeValue && !system && !notes) {
    return undefined;
  }
  if (!sizeValue) {
    throw new TypeError("size value is required when saving a garment size.");
  }

  return {
    value: sizeValue,
    ...(system ? { system } : {}),
    ...(notes ? { notes } : {}),
  };
}

function normalizeSettingsBudgetAnchor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("budget anchor change value must be an object.");
  }

  const amount = normalizeOptionalAmount(value.amount);
  const currency = typeof value.currency === "string" ? value.currency.trim() : "";
  const cadence = typeof value.cadence === "string" ? value.cadence.trim() : "";
  const notes = typeof value.notes === "string" ? value.notes.trim() : "";

  if (amount === undefined && !currency && !cadence && !notes) {
    return undefined;
  }
  if (amount === undefined) {
    throw new TypeError("budget anchor amount is required when saving a budget anchor.");
  }

  return {
    amount,
    ...(currency ? { currency } : {}),
    ...(cadence ? { cadence } : {}),
    ...(notes ? { notes } : {}),
  };
}

function normalizeSettingsMoney(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} change value must be an object.`);
  }

  const amount = normalizeOptionalAmount(value.amount);
  if (amount === undefined) {
    throw new TypeError(`${field}.amount must be provided.`);
  }

  return {
    amount,
    ...(value.currency === undefined ? {} : { currency: normalizeString(value.currency, `${field}.currency`) }),
  };
}

function normalizeOptionalAmount(value) {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new TypeError("amount must be a non-negative finite number.");
  }
  return amount;
}

function normalizeSettingsList(value, field) {
  const entries = Array.isArray(value) ? value : String(value ?? "").split(/[\n,]/g);

  return [...new Set(entries.map((item) => {
    if (typeof item !== "string") {
      throw new TypeError(`${field} entries must be strings.`);
    }
    return item.trim();
  }).filter(Boolean))];
}

function countSelectedCandidates(candidates) {
  return candidates.filter((candidate) => candidate.selected).length;
}

function normalizeStagedState(proposal) {
  if (proposal.staged === true) {
    return true;
  }

  if (typeof proposal.stagingStatus !== "string") {
    return false;
  }

  return ["staged", "success", "succeeded"].includes(proposal.stagingStatus.trim().toLowerCase());
}

function normalizeProposalFailure(proposal) {
  const status = typeof proposal.stagingStatus === "string" ? proposal.stagingStatus.trim().toLowerCase() : "";
  const failure =
    proposal.failureCard ??
    proposal.failure ??
    (["failed", "failure", "error", "out_of_stock", "login_expired", "site_error", "anti_bot"].includes(status)
      ? proposal
      : undefined);

  if (!failure || typeof failure !== "object" || Array.isArray(failure)) {
    return undefined;
  }

  return {
    explanation: normalizeString(
      failure.explanation ??
        createProposalFailureExplanation(failure.reason ?? failure.error ?? status, proposal.retailer ?? proposal.retailerName),
      "failure explanation",
    ),
    manualUrl: normalizeString(
      failure.manualUrl ?? failure.productUrl ?? proposal.productUrl ?? proposal.cartUrl,
      "manual URL",
    ),
  };
}

function createProposalFailureExplanation(value, retailer) {
  const text = String(value ?? "").trim().toLowerCase();
  const retailerLabel = typeof retailer === "string" && retailer.trim() ? retailer.trim() : "retailer";
  if (text === "out_of_stock" || text.includes("out of stock") || text.includes("sold out")) {
    return "Item out of stock";
  }
  if (text === "login_expired" || text.includes("login") || text.includes("session")) {
    return "Login expired";
  }
  if (text === "anti_bot" || /\b(anti-?bot|bot|captcha|challenge|cloudflare|blocked)\b/i.test(text)) {
    return `Staging blocked by ${retailerLabel} - anti-bot challenge`;
  }
  return "Site error";
}

function normalizeNonNegativeInteger(value, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative integer.`);
  }

  return value;
}

function normalizeId(value) {
  const normalized = normalizeString(value, "candidate id")
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, "-")
    .replaceAll(/^-|-$/g, "");

  return normalized || "candidate";
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
