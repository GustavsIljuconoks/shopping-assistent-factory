import { updateShoppingProfile } from "./shopping-profile.mjs";
import { ASKET_RETAILER, stageAsketCartItem } from "./asket-cart-staging-recipe.mjs";

export const SHOPPING_CHAT_LOW_CONFIDENCE_MESSAGE =
  "I found shopping intent, but I am not confident enough to make a proposal yet.";
export const ASKET_CART_URL = "https://www.asket.com/cart";

const DEFAULT_MIN_PROPOSAL_CONFIDENCE = 0.7;
const DEFAULT_PROFILE_CONFIRMATION_MESSAGE = "Got it. I saved that to your shopping profile.";

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
  dresses: ["dress", "dresses"],
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
  pendingProfileField,
  confirmedProfileField,
  profilePath,
  updateProfile = updateShoppingProfile,
  searchTool,
  renderConfirmationCard = createProfileConfirmationCard,
  renderProposalCard,
  chat,
  minProposalConfidence = DEFAULT_MIN_PROPOSAL_CONFIDENCE,
} = {}) {
  const text = normalizeMessage(message);

  if (confirmedProfileField) {
    return confirmProfileField({
      chat,
      confirmedProfileField,
      profilePath,
      updateProfile,
    });
  }

  if (pendingProfileField) {
    const pendingFact = extractPendingProfileFact(text, pendingProfileField, profile);
    if (!pendingFact) {
      return askClarification(chat, createProfileQuestion(pendingProfileField));
    }

    const confirmationCard = await renderConfirmationCard(pendingFact);
    await publishConfirmationCard(chat, confirmationCard, pendingFact);
    return {
      action: "confirmation_card",
      confirmationCard,
      pendingProfileField: pendingFact,
    };
  }

  const shoppingIntent = detectShoppingIntent(text);

  if (!shoppingIntent.detected) {
    return {
      action: "none",
      reason: "no_shopping_intent",
      shoppingIntent,
    };
  }

  const missingBootstrapField = profile ? findMissingBootstrapField(profile) : undefined;
  if (missingBootstrapField) {
    return askClarification(chat, {
      ...createProfileQuestion(missingBootstrapField),
      shoppingIntent,
    });
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

export function findMissingBootstrapField(profile) {
  if (!profile?.country) {
    return {
      field: "country",
      label: "country",
      profileKey: "country",
    };
  }

  if (!profile?.sizes?.tops?.value) {
    return {
      field: "topSize",
      garmentClass: "tops",
      label: "top size",
      profileKey: "sizes.tops",
    };
  }

  if (!profile?.sizes?.shoes?.value) {
    return {
      field: "shoeSizeEu",
      garmentClass: "shoes",
      label: "EU shoe size",
      profileKey: "sizes.shoes",
    };
  }

  if (!resolveProfileBudget(profile, "default")) {
    return {
      field: "roughBudget",
      label: "rough budget",
      profileKey: "budgetAnchors.default",
    };
  }

  return undefined;
}

export function createProfileConfirmationCard(profileFact) {
  const normalized = normalizeProfileFact(profileFact);
  return {
    type: "profile_confirmation_card",
    title: `Confirm ${normalized.label}`,
    body: formatProfileFactValue(normalized),
    confirmLabel: "Confirm",
    value: normalized.value,
    profileField: {
      field: normalized.field,
      garmentClass: normalized.garmentClass,
      label: normalized.label,
      profileKey: normalized.profileKey,
      value: normalized.value,
    },
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

function extractPendingProfileFact(message, profileField, profile) {
  const field = normalizeProfileField(profileField);
  const text = normalizeMessage(message);

  switch (field.field) {
    case "country": {
      const country = extractCountryCode(text);
      return country
        ? normalizeProfileFact({
            ...field,
            value: country,
          })
        : undefined;
    }
    case "topSize": {
      const size = extractExplicitSize(text) ?? extractLooseSize(text);
      return size
        ? normalizeProfileFact({
            ...field,
            value: {
              ...(size.system ? { system: size.system } : {}),
              value: size.value,
            },
          })
        : undefined;
    }
    case "shoeSizeEu": {
      const size = extractExplicitSize(text) ?? extractLooseShoeSize(text);
      return size
        ? normalizeProfileFact({
            ...field,
            value: {
              system: "EU",
              value: size.value,
            },
          })
        : undefined;
    }
    case "roughBudget": {
      const budget = extractPriceCeiling(text, profile) ?? extractLooseBudget(text, profile);
      return budget
        ? normalizeProfileFact({
            ...field,
            value: {
              amount: budget.amount,
              currency: budget.currency,
              cadence: "per_item",
            },
          })
        : undefined;
    }
    default:
      return undefined;
  }
}

async function confirmProfileField({ chat, confirmedProfileField, profilePath, updateProfile }) {
  const normalized = normalizeProfileFact(confirmedProfileField);
  if (typeof updateProfile !== "function") {
    throw new TypeError("updateProfile must be a function.");
  }

  const patch = createProfilePatch(normalized);
  const updatedProfile =
    profilePath === undefined ? await updateProfile(patch) : await updateProfile(patch, profilePath);

  await publishPlainText(chat, DEFAULT_PROFILE_CONFIRMATION_MESSAGE, {
    field: normalized.field,
    profileKey: normalized.profileKey,
    updatedProfile,
  });

  return {
    action: "profile_updated",
    field: normalized.field,
    profileKey: normalized.profileKey,
    updatedProfile,
  };
}

function createProfileQuestion(profileField) {
  const field = normalizeProfileField(profileField);
  const messages = {
    country: "Which country should I use for shopping availability and delivery?",
    topSize: "What top size should I remember?",
    shoeSizeEu: "What is your EU shoe size?",
    roughBudget: "What rough per-item budget should I use?",
  };

  return {
    field: field.field,
    message: messages[field.field],
    profileField: field,
  };
}

function createProfilePatch(profileFact) {
  switch (profileFact.field) {
    case "country":
      return { country: profileFact.value };
    case "topSize":
    case "shoeSizeEu":
      return {
        sizes: {
          [profileFact.garmentClass]: profileFact.value,
        },
      };
    case "roughBudget":
      return {
        budgetAnchors: {
          default: profileFact.value,
        },
        perItemPriceCeiling: profileFact.value,
      };
    default:
      throw new TypeError(`Unsupported profile field: ${profileFact.field}`);
  }
}

function normalizeProfileFact(profileFact) {
  if (!profileFact || typeof profileFact !== "object" || Array.isArray(profileFact)) {
    throw new TypeError("profile field must be an object.");
  }
  if (profileFact.profileField) {
    return normalizeProfileFact(profileFact.profileField);
  }

  const field = normalizeProfileField(profileFact);
  if (profileFact.value === undefined) {
    throw new TypeError("profile field value is required.");
  }

  return {
    ...field,
    value: normalizeProfileValue(field, profileFact.value),
  };
}

function normalizeProfileField(profileField) {
  if (!profileField || typeof profileField !== "object" || Array.isArray(profileField)) {
    throw new TypeError("profile field must be an object.");
  }
  if (profileField.profileField) {
    return normalizeProfileField(profileField.profileField);
  }

  switch (profileField.field) {
    case "country":
      return {
        field: "country",
        label: "country",
        profileKey: "country",
      };
    case "topSize":
      return {
        field: "topSize",
        garmentClass: "tops",
        label: "top size",
        profileKey: "sizes.tops",
      };
    case "shoeSizeEu":
      return {
        field: "shoeSizeEu",
        garmentClass: "shoes",
        label: "EU shoe size",
        profileKey: "sizes.shoes",
      };
    case "roughBudget":
      return {
        field: "roughBudget",
        label: "rough budget",
        profileKey: "budgetAnchors.default",
      };
    default:
      throw new TypeError(`Unsupported profile field: ${profileField.field}`);
  }
}

function normalizeProfileValue(profileField, value) {
  switch (profileField.field) {
    case "country": {
      const normalized = normalizeCountryCode(value);
      if (!normalized) {
        throw new TypeError("country value must be a 2-letter country code.");
      }
      return normalized;
    }
    case "topSize":
    case "shoeSizeEu":
      return normalizeProfileSizeValue(value, profileField.field);
    case "roughBudget":
      return normalizeProfileBudgetValue(value);
    default:
      throw new TypeError(`Unsupported profile field: ${profileField.field}`);
  }
}

function normalizeProfileSizeValue(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !value.value) {
    throw new TypeError(`${field} value must be a size object.`);
  }

  const normalized = { value: String(value.value).trim().toUpperCase() };
  if (!normalized.value) {
    throw new TypeError(`${field} value must be non-empty.`);
  }
  if (value.system) {
    normalized.system = String(value.system).trim();
  }
  return normalized;
}

function normalizeProfileBudgetValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("roughBudget value must be a money object.");
  }
  const amount = Number(value.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new TypeError("roughBudget amount must be a positive finite number.");
  }
  return {
    amount,
    currency: normalizeCurrency(value.currency) ?? "EUR",
    cadence: value.cadence ?? "per_item",
  };
}

function extractCountryCode(message) {
  const text = normalizeMessage(message);
  const labeled = text.match(/\b(?:country|ship(?:ping)?\s*to|deliver(?:y)?\s*to)\s*[:#-]?\s*([a-z]{2})\b/i);
  return normalizeCountryCode(labeled?.[1]) ?? normalizeCountryCode(text);
}

function extractLooseSize(message) {
  const text = normalizeMessage(message);
  const match = text.match(/\b(?:xxs|xs|s|m|l|xl|xxl|xxxl|[0-9]{1,3}(?:\.[0-9])?)\b/i);
  return match ? { value: match[0].toUpperCase() } : undefined;
}

function extractLooseShoeSize(message) {
  const text = normalizeMessage(message);
  const match = text.match(/\b([0-9]{2}(?:\.[0-9])?)\b/);
  return match ? { system: "EU", value: match[1] } : undefined;
}

function extractLooseBudget(message, profile) {
  const text = normalizeMessage(message);
  const currency = normalizeCurrency(profile?.currency) ?? "EUR";
  const match = text.match(/\b([0-9]+(?:[.,][0-9]{1,2})?)\b/);
  if (!match) {
    return undefined;
  }

  const amount = Number.parseFloat(match[1].replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? { amount, currency } : undefined;
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

async function publishConfirmationCard(chat, confirmationCard, profileFact) {
  if (!chat) {
    return;
  }
  const payload = {
    confirmationCard,
    pendingProfileField: profileFact,
  };
  if (typeof chat.showConfirmationCard === "function") {
    await chat.showConfirmationCard(confirmationCard, payload);
    return;
  }
  await publishPlainText(chat, confirmationCard.body, payload);
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

function normalizeCountryCode(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
}

function formatProfileFactValue(profileFact) {
  switch (profileFact.field) {
    case "country":
      return profileFact.value;
    case "topSize":
    case "shoeSizeEu":
      return [profileFact.value.system, profileFact.value.value].filter(Boolean).join(" ");
    case "roughBudget":
      return `${profileFact.value.currency} ${profileFact.value.amount}`;
    default:
      return String(profileFact.value);
  }
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
