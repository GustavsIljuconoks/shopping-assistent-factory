const STORAGE_KEY = "shopping.profile.v1";

const EMPTY_PROFILE = {
  country: "",
  currency: "",
  sizes: "",
  budgetAnchors: "",
  exclusions: "",
  ceiling: "",
  retailers: "",
};

export function createBrowserShoppingProfileStore(storage = globalThis.localStorage) {
  return {
    readProfile() {
      if (!storage) return { ...EMPTY_PROFILE };
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return { ...EMPTY_PROFILE };
      try {
        return { ...EMPTY_PROFILE, ...JSON.parse(raw) };
      } catch {
        return { ...EMPTY_PROFILE };
      }
    },
    writeProfile(profile) {
      const next = { ...EMPTY_PROFILE, ...profile };
      storage?.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    },
  };
}

export function renderShoppingSettingsPane(root, options = {}) {
  const store = options.store ?? createBrowserShoppingProfileStore();
  const profile = store.readProfile();

  root.innerHTML = `
    <nav class="settings-breadcrumb" aria-label="Settings path">
      <a href="#settings">Settings</a>
      <span aria-hidden="true">/</span>
      <strong>Shopping</strong>
    </nav>
    <section class="settings-pane" aria-labelledby="shopping-settings-title">
      <h1 id="shopping-settings-title">Shopping</h1>
      <form id="shopping-profile-form">
        ${input("country", "Country", profile.country)}
        ${input("currency", "Currency", profile.currency)}
        ${input("sizes", "Sizes", profile.sizes)}
        ${input("budgetAnchors", "Budget anchors", profile.budgetAnchors)}
        ${input("exclusions", "Exclusions", profile.exclusions)}
        ${input("ceiling", "Ceiling", profile.ceiling, "number")}
        ${input("retailers", "Retailer list", profile.retailers)}
        <button type="submit">Save</button>
      </form>
      <p id="shopping-profile-status" role="status"></p>
    </section>
  `;

  const form = root.querySelector("#shopping-profile-form");
  const status = root.querySelector("#shopping-profile-status");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    store.writeProfile(data);
    status.textContent = "Saved";
  });
}

function input(name, label, value, type = "text") {
  return `
    <label>
      <span>${label}</span>
      <input name="${name}" type="${type}" value="${escapeHtml(value)}" />
    </label>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
