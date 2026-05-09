import { ASKET_RETAILER, stageAsketCartItem } from "./asket-cart-staging-recipe.mjs";

export const SHOPPING_CHAT_LOW_CONFIDENCE_MESSAGE =
  "I found shopping intent, but I am not confident enough to make a proposal yet.";
export const ASKET_CART_URL = "https://www.asket.com/cart";

const DEFAULT_MIN_PROPOSAL_CONFIDENCE = 0.7;

const GARMENT_CLASS_ALIASES = Object.freeze({
  accessories: ["accessory", "accessories", "bag", "belt", "cap", "hat", "scarf"],
  bottoms: [
    "bottom",
    "bottoms",
    "chino",
    "chinos",
    "jean",
    "jeans",
    "pant",
    "pants",
    "shorts",
    "trouser",
    "trousers",
  ],
  outerwear: ["coat", "jacket", "outerwear", "parka"],
  shoes: [
    "boot",
    "boots",
    "loafer",
    "loafers",
    "sandal",
    "sandals",
    "shoe",
    "shoes",
    "sneaker",
    "sneakers",
  ],
  tops: ["hoodie", "shirt", "shirts", "sweater", "t-shirt", "tee", "top", "tops"],
  underwear: ["boxer", "boxers", "brief", "briefs", "underwear"],
});

const SHOPPING_INTENT_TERMS = Object.freeze([
  "buy",
  "find",
  "get",
  "need",
  "order",
  "purchase",
  "shop",
  "shopping",
  "source",
  "want",
]);

export async function handleShoppingChatMessage({
  message,
  profile,
  searchTool,
  renderProposalCard,
  chat,
  minProposalConfidence = DEFAULT_MIN_PROPOSAL_CONFIDENCE,
} = {}) {
  const text = normalizeMessage(message);
  const shoppingIntent = detectShoppingIntent(text);

  if (!shoppingIntent.detected) {
    return {
      action: "none",
      reason: "no_shopping_intent",
      shoppingIntent,
    };
  }

  const garmentClass = extractGarmentClass(text);
  if (!garmentClass) {
    return askClarification(chat, {
      field: "garmentClass",
      message: "What kind of garment should I search for?",
      shoppingIntent,
    });
  }

  const size = extractExplicitSize(text) ?? resolveProfileSize(profile, garmentClass);
  if (!size) {
    return askClarification(chat, {
      field: "size",
      message: `What size should I use for ${garmentClass}?`,
      shoppingIntent,
      context: { garmentClass },
    });
  }

  const priceCeiling =
    extractPriceCeiling(text, profile) ?? resolveProfileBudget(profile, garmentClass);
  if (!priceCeiling) {
    return askClarification(chat, {
      field: "priceCeiling",
      message: `What is the maximum price per item for ${garmentClass}?`,
      shoppingIntent,
      context: { garmentClass, size },
    });
  }

  if (!searchTool || typeof searchTool.search !== "function") {
    throw new TypeError("searchTool.search must be a function.");
  }

  const searchContext = {
    garmentClass,
    memories: Array.isArray(profile?.memories) ? profile.memories : [],
    originalMessage: text,
    priceCeiling,
    size,
  };
  const searchResult = await searchTool.search(searchContext);
  const confidence = normalizeConfidence(searchResult?.confidence);

  if (confidence < minProposalConfidence) {
    await publishPlainText(chat, SHOPPING_CHAT_LOW_CONFIDENCE_MESSAGE, {
      confidence,
      context: searchContext,
      reason: "low_confidence",
      searchResult,
    });
    return {
      action: "plain_text",
      confidence,
      context: searchContext,
      message: SHOPPING_CHAT_LOW_CONFIDENCE_MESSAGE,
      reason: "low_confidence",
      searchResult,
      shoppingIntent,
    };
  }

  if (!renderProposalCard || typeof renderProposalCard !== "function") {
    throw new TypeError("renderProposalCard must be a function.");
  }

  const proposalCard = await renderProposalCard(searchResult, searchContext);
  return {
    action: "proposal_card",
    confidence,
    context: searchContext,
    proposalCard,
    searchResult,
    shoppingIntent,
  };
}

export async function stageSelectedAsketCandidates({
  selectedCandidates,
  page,
  auditLogPath,
  stageCartItem = stageAsketCartItem,
  refreshActiveCarts,
  renderResultCard = renderAsketStagingResultCard,
  cartUrl = ASKET_CART_URL,
} = {}) {
  const candidates = normalizeSelectedCandidates(selectedCandidates);

  if (typeof stageCartItem !== "function") {
    throw new TypeError("stageCartItem must be a function.");
  }

  const results = [];
  let stagedCount = 0;
  let activeCarts;

  for (const candidate of candidates) {
    const result = await stageCartItem({
      auditLogPath,
      page,
      productId: candidate.productId,
      productUrl: candidate.productUrl,
      size: candidate.size,
    });
    results.push({ candidate, result });

    if (result?.status === "success") {
      stagedCount += 1;
      if (typeof refreshActiveCarts === "function") {
        activeCarts = await refreshActiveCarts({
          cartUrl,
          lastResult: result,
          retailer: ASKET_RETAILER,
          stagedCount,
        });
      }
    }
  }

  return {
    action: "asket_staging_result",
    activeCarts,
    cartUrl,
    resultCard: await renderResultCard({
      cartUrl,
      results,
      stagedCount,
      totalSelected: candidates.length,
    }),
    results,
    stagedCount,
    totalSelected: candidates.length,
  };
}

export function renderAsketStagingResultCard({
  stagedCount,
  totalSelected,
  cartUrl = ASKET_CART_URL,
} = {}) {
  return {
    openCartLink: {
      href: normalizeUrl(cartUrl, "cartUrl"),
      label: "Open cart on Asket",
    },
    retailer: ASKET_RETAILER,
    stagedCount: normalizeNonNegativeInteger(stagedCount, "stagedCount"),
    totalSelected: normalizeNonNegativeInteger(totalSelected, "totalSelected"),
    type: "asket_staging_result_card",
  };
}

export function detectShoppingIntent(message) {
  const text = normalizeMessage(message);
  const hasIntentTerm = SHOPPING_INTENT_TERMS.some((term) => hasWord(text, term));
  const garmentClass = extractGarmentClass(text);

  return {
    detected:
      Boolean(hasIntentTerm && garmentClass) ||
      Boolean(hasIntentTerm && looksLikeShoppingRequest(text)),
    garmentClass,
  };
}

export function extractGarmentClass(message) {
  const text = normalizeMessage(message);

  for (const [garmentClass, aliases] of Object.entries(GARMENT_CLASS_ALIASES)) {
    if (aliases.some((alias) => hasWord(text, alias))) {
      return garmentClass;
    }
  }

  return undefined;
}

export function extractExplicitSize(message) {
  const text = normalizeMessage(message);
  const labeled = text.match(/\b(?:size|sz)\s*[:#-]?\s*([a-z0-9][a-z0-9./-]{0,7})\b/i);
  if (labeled) {
    return { value: labeled[1].toUpperCase() };
  }

  const eu = text.match(/\b(?:eu|eur)\s*([0-9]{2}(?:\.[0-9])?)\b/i);
  if (eu) {
    return { system: "EU", value: eu[1] };
  }

  return undefined;
}

export function extractPriceCeiling(message, profile) {
  const text = normalizeMessage(message);
  const currency = normalizeCurrency(profile?.currency) ?? "EUR";
  const match = text.match(
    /(?:under|below|less than|max(?:imum)?|up to|<=?)\s*(eur|euro|euros|usd|dollars?|gbp|pounds?)?\s*([0-9]+(?:[.,][0-9]{1,2})?)\b/i,
  ) ?? text.match(
    /\b([0-9]+(?:[.,][0-9]{1,2})?)\s*(eur|euro|euros|usd|dollars?|gbp|pounds?)\b/i,
  );

  if (!match) {
    return undefined;
  }

  const amountIndex = Number.isFinite(Number.parseFloat(match[1])) ? 1 : 2;
  const symbol = amountIndex === 1 ? match[2] : match[1];
  const amount = Number.parseFloat(match[amountIndex].replace(",", "."));

  if (!Number.isFinite(amount) || amount < 0) {
    return undefined;
  }

  return {
    amount,
    currency: currencyFromToken(symbol) ?? currency,
  };
}

function resolveProfileSize(profile, garmentClass) {
  const size = profile?.sizes?.[garmentClass];
  if (!size?.value) {
    return undefined;
  }

  return {
    ...(size.system ? { system: size.system } : {}),
    value: String(size.value).trim(),
  };
}

function resolveProfileBudget(profile, garmentClass) {
  const anchor =
    profile?.budgetAnchors?.[garmentClass] ??
    profile?.budgetAnchors?.default ??
    profile?.perItemPriceCeiling;

  if (
    !anchor ||
    typeof anchor.amount !== "number" ||
    !Number.isFinite(anchor.amount) ||
    anchor.amount <= 0
  ) {
    return undefined;
  }

  return {
    amount: anchor.amount,
    currency: normalizeCurrency(anchor.currency) ?? normalizeCurrency(profile?.currency) ?? "EUR",
  };
}

async function askClarification(chat, result) {
  await publishPlainText(chat, result.message, result);
  return {
    action: "clarify",
    ...result,
  };
}

async function publishPlainText(chat, message, payload) {
  if (!chat) {
    return;
  }
  if (typeof chat.say === "function") {
    await chat.say(message, payload);
    return;
  }
  if (typeof chat === "function") {
    await chat(message, payload);
  }
}

function detectGarmentWord(text) {
  return Object.values(GARMENT_CLASS_ALIASES).some((aliases) =>
    aliases.some((alias) => hasWord(text, alias)),
  );
}

function looksLikeShoppingRequest(text) {
  return (
    /\b(wear|outfit|clothes|clothing|wardrobe|retailer|cart|something)\b/i.test(text) ||
    detectGarmentWord(text)
  );
}

function normalizeConfidence(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function normalizeCurrency(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : undefined;
}

function currencyFromToken(token) {
  switch (token?.toLowerCase()) {
    case "eur":
    case "euro":
    case "euros":
      return "EUR";
    case "usd":
    case "dollar":
    case "dollars":
      return "USD";
    case "gbp":
    case "pound":
    case "pounds":
      return "GBP";
    default:
      return undefined;
  }
}

function hasWord(text, word) {
  return new RegExp(`\\b${escapeRegExp(word)}\\b`, "i").test(text);
}

function normalizeMessage(message) {
  if (typeof message !== "string" || !message.trim()) {
    throw new TypeError("message must be a non-empty string.");
  }
  return message.trim();
}

function normalizeSelectedCandidates(selectedCandidates) {
  if (!Array.isArray(selectedCandidates)) {
    throw new TypeError("selectedCandidates must be an array.");
  }
  return selectedCandidates.map((candidate, index) => normalizeSelectedCandidate(candidate, index));
}

function normalizeSelectedCandidate(candidate, index) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError(`selectedCandidates[${index}] must be an object.`);
  }

  const productUrl =
    candidate.productUrl === undefined
      ? undefined
      : normalizeUrl(candidate.productUrl, `selectedCandidates[${index}].productUrl`);
  const productId =
    candidate.productId === undefined
      ? undefined
      : normalizeNonEmptyString(candidate.productId, `selectedCandidates[${index}].productId`);

  if (!productUrl && !productId) {
    throw new TypeError(
      `selectedCandidates[${index}] must include productUrl or productId.`,
    );
  }

  return {
    ...(candidate.id === undefined
      ? {}
      : { id: normalizeNonEmptyString(candidate.id, `selectedCandidates[${index}].id`) }),
    ...(productId === undefined ? {} : { productId }),
    ...(productUrl === undefined ? {} : { productUrl }),
    size: normalizeNonEmptyString(candidate.size, `selectedCandidates[${index}].size`),
    ...(candidate.title === undefined
      ? {}
      : { title: normalizeNonEmptyString(candidate.title, `selectedCandidates[${index}].title`) }),
  };
}

function normalizeNonEmptyString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function normalizeNonNegativeInteger(value, field) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a non-negative integer.`);
  }
  return value;
}

function normalizeUrl(value, field) {
  const normalized = normalizeNonEmptyString(value, field);
  try {
    return new URL(normalized).toString();
  } catch {
    throw new TypeError(`${field} must be a valid URL.`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
