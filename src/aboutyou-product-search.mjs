import { VisibleAutomationBrowserRun } from "./automation-browser.mjs";
import { ensureRetailerBrowserProfile } from "./shopping-browser-profiles.mjs";
import { SHOPPING_MEMORY_TAG } from "./shopping-profile.mjs";
import { ABOUT_YOU_RETAILER_IDENTIFIER } from "./aboutyou-login-flow.mjs";

export { ABOUT_YOU_RETAILER_IDENTIFIER };
export const ABOUT_YOU_SEARCH_URL_BASE = "https://www.aboutyou.lv/c/sievietem-20201";
export const ABOUT_YOU_PRODUCT_SEARCH_MAX_CANDIDATES = 3;

const MEMORY_MATCH_STOP_WORDS = Object.freeze([
  "about",
  "aboutyou",
  "because",
  "black",
  "blue",
  "green",
  "returned",
  "shirt",
  "shirts",
  "size",
  "white",
]);

export async function searchAboutYouProducts({
  intent,
  products,
  searchProducts,
  browserRun,
  launcher,
  windowManager,
  chat,
  profilesRoot,
  searchUrlBase = ABOUT_YOU_SEARCH_URL_BASE,
  maxCandidates = ABOUT_YOU_PRODUCT_SEARCH_MAX_CANDIDATES,
  memories = [],
} = {}) {
  const normalizedIntent = normalizeAboutYouProductIntent(intent);
  const normalizedMaxCandidates = normalizeMaxCandidates(maxCandidates);
  const rankingMemories = normalizeRankingMemories(memories);
  const searchUrl = createAboutYouSearchUrl(normalizedIntent, searchUrlBase);
  const rawProducts =
    products ??
    (await fetchAboutYouProducts({
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
    throw new TypeError("About You product search adapter must return an array.");
  }

  return rankAboutYouProducts(rawProducts, normalizedIntent, rankingMemories)
    .slice(0, normalizedMaxCandidates)
    .map(({ candidate }) => candidate);
}

export function createAboutYouSearchUrl(intent, searchUrlBase = ABOUT_YOU_SEARCH_URL_BASE) {
  const normalizedIntent = normalizeAboutYouProductIntent(intent);
  const url = new URL(searchUrlBase);
  url.searchParams.set("q", buildAboutYouSearchQuery(normalizedIntent));
  return url.toString();
}

export function normalizeAboutYouProductIntent(intent) {
  if (!intent || typeof intent !== "object" || Array.isArray(intent)) {
    throw new TypeError("About You product intent must be an object.");
  }

  return {
    garmentClass: normalizeString(intent.garmentClass, "garmentClass"),
    size: normalizeString(intent.size, "size"),
    colorKeywords: normalizeColorKeywords(intent.colorKeywords ?? intent.colors),
    priceCeiling: normalizePrice(intent.priceCeiling, "priceCeiling"),
  };
}

function buildAboutYouSearchQuery(intent) {
  return [intent.garmentClass, ...intent.colorKeywords].join(" ");
}

async function fetchAboutYouProducts({
  browserRun,
  chat,
  intent,
  launcher,
  profilesRoot,
  searchProducts,
  searchUrl,
  windowManager,
}) {
  if (!browserRun && !launcher) {
    if (typeof searchProducts !== "function") {
      throw new TypeError("searchProducts must be a function when products are not provided.");
    }
    return searchProducts({
      intent,
      retailerIdentifier: ABOUT_YOU_RETAILER_IDENTIFIER,
      searchUrl,
    });
  }

  const profile = await ensureRetailerBrowserProfile(ABOUT_YOU_RETAILER_IDENTIFIER, profilesRoot);
  const run =
    browserRun ??
    new VisibleAutomationBrowserRun({
      chat,
      launcher,
      windowManager,
    });

  await run.startStagingRun({
    retailer: ABOUT_YOU_RETAILER_IDENTIFIER,
    startUrl: searchUrl,
    userDataDir: profile.userDataDir,
  });

  const session = run.requireCurrentRun().session;
  await openSearchPage(session, searchUrl);

  try {
    const result =
      typeof searchProducts === "function"
        ? await searchProducts({
            intent,
            profile,
            retailerIdentifier: ABOUT_YOU_RETAILER_IDENTIFIER,
            searchUrl,
            session,
          })
        : await extractAboutYouProductCards(session);
    await run.completeSuccessfully();
    return result;
  } catch (err) {
    if (typeof run.completeSuccessfully === "function") {
      await run.completeSuccessfully();
    }
    throw err;
  }
}

async function extractAboutYouProductCards(session) {
  if (session && typeof session.extractProducts === "function") {
    return session.extractProducts({ retailerIdentifier: ABOUT_YOU_RETAILER_IDENTIFIER });
  }
  if (session && typeof session.evaluate === "function") {
    return session.evaluate(() =>
      Array.from(
        document.querySelectorAll("article, [data-testid*='product'], [class*='product-card']"),
      )
        .map((card) => {
          const link = card.querySelector("a[href]");
          const image = card.querySelector("img");
          const text = card.textContent ?? "";
          return {
            productUrl: link?.href,
            imageUrl: image?.currentSrc || image?.src,
            title: image?.alt || text.split("\n").map((part) => part.trim()).find(Boolean),
            color: text,
            priceText: text,
            tags: [text],
          };
        })
        .filter((product) => product.productUrl && product.title),
    );
  }
  throw new TypeError("session must provide extractProducts or evaluate for About You search.");
}

function rankAboutYouProducts(products, intent, memories = []) {
  return products
    .map((product, index) => normalizeAboutYouProductCandidate(product, intent, index))
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
      score: scoreCandidate(entry, intent) - shoppingMemoryPenalty(entry, memories),
      candidate: {
        ...entry.candidate,
        reasoning: createReasoning(entry, intent, memories),
      },
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);
}

function normalizeAboutYouProductCandidate(product, intent, index) {
  if (!product || typeof product !== "object" || Array.isArray(product)) {
    throw new TypeError("About You product candidates must be objects.");
  }

  const productUrl = normalizeUrl(
    product.productUrl ?? product.url,
    `products[${index}].productUrl`,
  );
  const imageUrl = normalizeUrl(product.imageUrl ?? product.image, `products[${index}].imageUrl`);
  const title = normalizeString(product.title, `products[${index}].title`);
  const color = normalizeString(product.color, `products[${index}].color`);
  const price = normalizePrice(product.price ?? product.priceText, `products[${index}].price`);
  const availableSizes = normalizeOptionalStringArray(product.availableSizes ?? product.sizes);
  const size = normalizeCandidateSize(product.size, availableSizes, intent.size);
  const brand =
    product.brand === undefined
      ? ABOUT_YOU_RETAILER_IDENTIFIER
      : normalizeString(product.brand, `products[${index}].brand`);
  const tags = normalizeOptionalStringArray(product.tags);
  const category =
    product.category === undefined
      ? ""
      : normalizeString(product.category, `products[${index}].category`);
  const productId =
    product.productId === undefined
      ? undefined
      : normalizeString(product.productId, `products[${index}].productId`);
  const searchableText = normalizeSearchText(
    [brand, title, color, category, ...tags, ...availableSizes].join(" "),
  );

  return {
    availableSizes,
    candidate: {
      ...(productId ? { productId } : {}),
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

function createReasoning(entry, intent, memories) {
  const { candidate } = entry;
  const currency = candidate.price.currency;
  const memoryNote =
    shoppingMemoryPenalty(entry, memories) > 0 ? " De-prioritized by Shopping memory." : "";
  return `Matches ${intent.garmentClass}, ${intent.colorKeywords.join("/")}, size ${candidate.size} under ${currency} ${intent.priceCeiling.amount}.${memoryNote}`;
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

function shoppingMemoryPenalty(entry, memories) {
  const matchedNegativeMemories = memories.filter((memory) =>
    memory.sentiment === "negative" && memoryMatchesCandidate(memory, entry),
  );
  return matchedNegativeMemories.length * 60;
}

function memoryMatchesCandidate(memory, { candidate, searchableText }) {
  const memoryText = normalizeSearchText(
    [
      memory.content,
      memory.outcome,
      memory.subject?.brand,
      memory.subject?.title,
      memory.subject?.color,
      memory.subject?.size,
      memory.subject?.category,
      ...(memory.subject?.tags ?? []),
    ].filter(Boolean).join(" "),
  );
  const candidateText = normalizeSearchText(
    [candidate.brand, candidate.title, candidate.color, candidate.size, searchableText].join(" "),
  );
  const terms = memoryText
    .split(/\s+/)
    .map((term) => term.replaceAll(/[^a-z0-9]/g, ""))
    .filter((term) => term.length >= 4 && !MEMORY_MATCH_STOP_WORDS.includes(term));
  return terms.some((term) => candidateText.includes(term));
}

function normalizeRankingMemories(memories) {
  if (memories === undefined) {
    return [];
  }
  if (!Array.isArray(memories)) {
    throw new TypeError("memories must be an array.");
  }
  return memories
    .filter((memory) => memory && typeof memory === "object" && !Array.isArray(memory))
    .filter((memory) => Array.isArray(memory.tags) && memory.tags.includes(SHOPPING_MEMORY_TAG))
    .map((memory) => ({
      content: typeof memory.content === "string" ? memory.content : "",
      outcome: typeof memory.outcome === "string" ? memory.outcome : "",
      sentiment: typeof memory.sentiment === "string" ? memory.sentiment : "neutral",
      subject:
        memory.subject && typeof memory.subject === "object" && !Array.isArray(memory.subject)
          ? memory.subject
          : undefined,
    }));
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
  if (typeof value === "string") {
    const amount = Number.parseFloat(
      value
        .replace(/\s+/g, "")
        .replace(",", ".")
        .match(/[0-9]+(?:\.[0-9]{1,2})?/)?.[0] ?? "NaN",
    );
    if (!Number.isFinite(amount) || amount < 0) {
      throw new TypeError(`${field} must include a valid price amount.`);
    }
    return {
      amount,
      currency: value.toUpperCase().includes("USD") ? "USD" : "EUR",
    };
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
  return String(value ?? "")
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasSearchTerm(text, term) {
  const normalizedTerm = normalizeSearchText(term);
  return normalizedTerm
    .split(/\s+/)
    .filter(Boolean)
    .some((part) => text.includes(part));
}

function sameSize(left, right) {
  return normalizeSearchText(left).replace(/\s+/g, "") === normalizeSearchText(right).replace(/\s+/g, "");
}
