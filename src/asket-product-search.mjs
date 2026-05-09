import { ASKET_RETAILER_IDENTIFIER } from "./asket-login-flow.mjs";
import { VisibleAutomationBrowserRun } from "./automation-browser.mjs";
import { ensureRetailerBrowserProfile } from "./shopping-browser-profiles.mjs";

export { ASKET_RETAILER_IDENTIFIER };
export const ASKET_SEARCH_URL_BASE = "https://www.asket.com/en-dk/search";
export const ASKET_PRODUCT_SEARCH_MAX_CANDIDATES = 3;

export async function searchAsketProducts({
  intent,
  products,
  searchProducts,
  browserRun,
  launcher,
  windowManager,
  chat,
  profilesRoot,
  searchUrlBase = ASKET_SEARCH_URL_BASE,
  maxCandidates = ASKET_PRODUCT_SEARCH_MAX_CANDIDATES,
} = {}) {
  const normalizedIntent = normalizeAsketProductIntent(intent);
  const normalizedMaxCandidates = normalizeMaxCandidates(maxCandidates);
  const searchUrl = createAsketSearchUrl(normalizedIntent, searchUrlBase);
  const rawProducts =
    products ??
    (await fetchAsketProducts({
      browserRun,
      chat,
      intent: normalizedIntent,
      launcher,
      profilesRoot,
      searchProducts,
      searchUrl,
      windowManager,
    }));

  if (!Array.isArray(rawProducts)) {
    throw new TypeError("Asket product search adapter must return an array.");
  }

  return rankAsketProducts(rawProducts, normalizedIntent)
    .slice(0, normalizedMaxCandidates)
    .map(({ candidate }) => candidate);
}

export function createAsketSearchUrl(intent, searchUrlBase = ASKET_SEARCH_URL_BASE) {
  const normalizedIntent = normalizeAsketProductIntent(intent);
  const url = new URL(searchUrlBase);
  url.searchParams.set("q", buildAsketSearchQuery(normalizedIntent));
  return url.toString();
}

export function normalizeAsketProductIntent(intent) {
  if (!intent || typeof intent !== "object" || Array.isArray(intent)) {
    throw new TypeError("Asket product intent must be an object.");
  }

  const garmentClass = normalizeString(intent.garmentClass, "garmentClass");
  const size = normalizeString(intent.size, "size");
  const colorKeywords = normalizeColorKeywords(intent.colorKeywords ?? intent.colors);
  const priceCeiling = normalizePrice(intent.priceCeiling, "priceCeiling");

  return {
    garmentClass,
    size,
    colorKeywords,
    priceCeiling,
  };
}

function buildAsketSearchQuery(intent) {
  return [intent.garmentClass, ...intent.colorKeywords].join(" ");
}

async function fetchAsketProducts({
  browserRun,
  chat,
  intent,
  launcher,
  profilesRoot,
  searchProducts,
  searchUrl,
  windowManager,
}) {
  if (typeof searchProducts !== "function") {
    throw new TypeError("searchProducts must be a function when products are not provided.");
  }

  if (!browserRun && !launcher) {
    return searchProducts({
      intent,
      retailerIdentifier: ASKET_RETAILER_IDENTIFIER,
      searchUrl,
    });
  }

  const profile = await ensureRetailerBrowserProfile(ASKET_RETAILER_IDENTIFIER, profilesRoot);
  const run =
    browserRun ??
    new VisibleAutomationBrowserRun({
      chat,
      launcher,
      windowManager,
    });

  await run.startStagingRun({
    retailer: ASKET_RETAILER_IDENTIFIER,
    startUrl: searchUrl,
    userDataDir: profile.userDataDir,
  });

  const session = run.requireCurrentRun().session;
  await openSearchPage(session, searchUrl);

  try {
    const result = await searchProducts({
      intent,
      profile,
      retailerIdentifier: ASKET_RETAILER_IDENTIFIER,
      searchUrl,
      session,
    });
    await run.completeSuccessfully();
    return result;
  } catch (err) {
    if (typeof run.completeSuccessfully === "function") {
      await run.completeSuccessfully();
    }
    throw err;
  }
}

function rankAsketProducts(products, intent) {
  return products
    .map((product, index) => normalizeAsketProductCandidate(product, intent, index))
    .filter(({ candidate }) => candidate.price.amount <= intent.priceCeiling.amount)
    .filter(({ candidate }) => candidate.price.currency === intent.priceCeiling.currency)
    .filter(({ searchableText, candidate }) =>
      matchesGarment(searchableText, intent.garmentClass, candidate.title),
    )
    .filter(({ searchableText, candidate }) =>
      matchesColor(searchableText, candidate.color, intent.colorKeywords),
    )
    .filter(({ candidate, availableSizes }) =>
      matchesSize(candidate.size, availableSizes, intent.size),
    )
    .map((entry) => ({
      ...entry,
      score: scoreCandidate(entry, intent),
      candidate: {
        ...entry.candidate,
        reasoning: createReasoning(entry.candidate, intent),
      },
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
}

function normalizeAsketProductCandidate(product, intent, index) {
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    throw new TypeError("Asket product candidates must be objects.");
  }

  const productUrl = normalizeUrl(
    product.productUrl ?? product.url,
    `products[${index}].productUrl`,
  );
  const imageUrl = normalizeUrl(product.imageUrl ?? product.image, `products[${index}].imageUrl`);
  const title = normalizeString(product.title, `products[${index}].title`);
  const color = normalizeString(product.color, `products[${index}].color`);
  const price = normalizePrice(product.price, `products[${index}].price`);
  const availableSizes = normalizeOptionalStringArray(product.availableSizes ?? product.sizes);
  const size = normalizeCandidateSize(product.size, availableSizes, intent.size);
  const brand =
    product.brand === undefined
      ? ASKET_RETAILER_IDENTIFIER
      : normalizeString(product.brand, `products[${index}].brand`);
  const tags = normalizeOptionalStringArray(product.tags);
  const category =
    product.category === undefined
      ? ""
      : normalizeString(product.category, `products[${index}].category`);
  const searchableText = normalizeSearchText(
    [title, color, category, ...tags, ...availableSizes].join(" "),
  );

  return {
    availableSizes,
    candidate: {
      productUrl,
      imageUrl,
      brand,
      title,
      size,
      color,
      price,
      reasoning: "",
    },
    index,
    searchableText,
  };
}

function normalizeCandidateSize(size, availableSizes, requestedSize) {
  if (size !== undefined) {
    return normalizeString(size, "size");
  }
  if (availableSizes.some((candidateSize) => sameSize(candidateSize, requestedSize))) {
    return requestedSize;
  }
  return availableSizes[0] ?? requestedSize;
}

function scoreCandidate({ candidate, searchableText, availableSizes }, intent) {
  let score = 0;
  const garmentText = normalizeSearchText(intent.garmentClass);
  const titleText = normalizeSearchText(candidate.title);
  if (hasSearchTerm(titleText, garmentText)) {
    score += 40;
  } else if (hasSearchTerm(searchableText, garmentText)) {
    score += 25;
  }

  if (sameSize(candidate.size, intent.size)) {
    score += 20;
  } else if (availableSizes.some((size) => sameSize(size, intent.size))) {
    score += 16;
  }

  score += colorMatchCount(`${candidate.color} ${candidate.title}`, intent.colorKeywords) * 15;
  score += colorMatchCount(searchableText, intent.colorKeywords) * 5;
  if (intent.priceCeiling.amount > 0) {
    score += Math.max(0, 10 - (candidate.price.amount / intent.priceCeiling.amount) * 10);
  }
  return score;
}

function createReasoning(candidate, intent) {
  const currency = candidate.price.currency;
  return `Matches ${intent.garmentClass}, ${intent.colorKeywords.join("/")}, size ${candidate.size} under ${currency} ${intent.priceCeiling.amount}.`;
}

function matchesGarment(searchableText, garmentClass, title) {
  const garmentText = normalizeSearchText(garmentClass);
  return (
    hasSearchTerm(normalizeSearchText(title), garmentText) ||
    hasSearchTerm(searchableText, garmentText)
  );
}

function matchesColor(searchableText, color, colorKeywords) {
  const colorText = normalizeSearchText(color);
  return colorKeywords.some((keyword) => {
    const normalizedKeyword = normalizeSearchText(keyword);
    return colorText.includes(normalizedKeyword) || searchableText.includes(normalizedKeyword);
  });
}

function matchesSize(size, availableSizes, requestedSize) {
  return (
    sameSize(size, requestedSize) ||
    availableSizes.some((candidateSize) => sameSize(candidateSize, requestedSize))
  );
}

function colorMatchCount(text, colorKeywords) {
  const normalizedText = normalizeSearchText(text);
  return colorKeywords.filter((keyword) => normalizedText.includes(normalizeSearchText(keyword))).length;
}

async function openSearchPage(session, searchUrl) {
  if (session && typeof session.goto === "function") {
    await session.goto(searchUrl);
    return;
  }
  if (session && typeof session.navigate === "function") {
    await session.navigate(searchUrl);
    return;
  }
  if (session && typeof session.open === "function") {
    await session.open(searchUrl);
  }
}

function normalizeColorKeywords(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("colorKeywords must be a non-empty array.");
  }
  return [...new Set(value.map((item) => normalizeString(item, "colorKeywords")))];
}

function normalizeOptionalStringArray(value) {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new TypeError("optional string lists must be arrays.");
  }
  return value.map((item) => normalizeString(item, "optional string list"));
}

function normalizeString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function normalizeUrl(value, field) {
  const normalized = normalizeString(value, field);
  try {
    return new URL(normalized).toString();
  } catch {
    throw new TypeError(`${field} must be a valid URL.`);
  }
}

function normalizePrice(value, field) {
  if (typeof value === "number") {
    return normalizePrice({ amount: value, currency: "EUR" }, field);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object.`);
  }
  if (typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount < 0) {
    throw new TypeError(`${field}.amount must be a non-negative finite number.`);
  }
  return {
    amount: value.amount,
    currency:
      value.currency === undefined ? "EUR" : normalizeCurrency(value.currency, `${field}.currency`),
  };
}

function normalizeCurrency(value, field) {
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be a string.`);
  }
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new TypeError(`${field} must be a 3-letter uppercase code.`);
  }
  return normalized;
}

function normalizeMaxCandidates(value) {
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError("maxCandidates must be a positive integer.");
  }
  return value;
}

function normalizeSearchText(value) {
  return String(value).trim().toLowerCase();
}

function hasSearchTerm(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}

function sameSize(left, right) {
  return (
    normalizeSearchText(left).replace(/\s+/g, "") ===
    normalizeSearchText(right).replace(/\s+/g, "")
  );
}
