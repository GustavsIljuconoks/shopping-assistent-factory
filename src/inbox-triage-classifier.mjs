import { detectShoppingIntent } from "./shopping-chat-flow.mjs";

export const SHOP_TRIAGE_ACTION = "Shop";

const INBOX_BUYING_INTENT_PATTERN =
  /\b(?:buy|find(?:\s+me)?|get|need|order|purchase|shop\s+for|source|want)\b/i;

const INBOX_SHOPPING_VOCABULARY_PATTERN =
  /\b(?:accessor(?:y|ies)|bag|belt|blazer|blouse|boot|boots|bottoms?|cardigans?|chinos?|clothes|clothing|coat|dress(?:es)?|hoodie|jacket|jeans|jumper|jumpers|knit|knits|leggings?|loafer|loafers|outerwear|pants|parka|pullover|pullovers|sandals?|shirt|shirts|shoe|shoes|shorts|skirt|skirts|sneakers?|sweater|t-?shirt|tee|top|tops|trainers?|trouser|trousers|underwear|wardrobe)\b/i;

const INBOX_GARMENT_CLASS_PATTERNS = Object.freeze([
  ["shoes", /\b(?:boot|boots|loafer|loafers|sandals?|shoe|shoes|sneakers?|trainers?)\b/i],
  ["bottoms", /\b(?:bottoms?|chinos?|jeans|leggings?|pants|shorts|skirt|skirts|trouser|trousers)\b/i],
  ["tops", /\b(?:blouse|cardigans?|hoodie|jumper|jumpers|knit|knits|pullover|pullovers|shirt|shirts|sweater|t-?shirt|tee|top|tops)\b/i],
  ["outerwear", /\b(?:blazer|coat|jacket|outerwear|parka)\b/i],
  ["dresses", /\b(?:dress|dresses)\b/i],
  ["accessories", /\b(?:accessor(?:y|ies)|bag|belt)\b/i],
  ["underwear", /\b(?:underwear)\b/i],
]);

export function classifyInboxQuickCapture(capture) {
  const text = normalizeCaptureText(capture);
  const shoppingIntent = detectShoppingIntent(text);
  const detected = shoppingIntent.detected || detectsInboxBuyingIntent(text);

  return {
    suggestedAction: detected ? SHOP_TRIAGE_ACTION : undefined,
    reason: detected ? "shopping_intent" : "no_shopping_intent",
    shoppingIntent: {
      ...shoppingIntent,
      detected,
      garmentClass: shoppingIntent.garmentClass ?? detectInboxGarmentClass(text),
    },
  };
}

export function suggestInboxTriageAction(capture) {
  return classifyInboxQuickCapture(capture).suggestedAction;
}

function normalizeCaptureText(capture) {
  if (typeof capture === "string") {
    return capture;
  }

  if (!capture || typeof capture !== "object" || Array.isArray(capture)) {
    return "";
  }

  return [capture.title, capture.text, capture.message, capture.body]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ");
}

function detectsInboxBuyingIntent(text) {
  return INBOX_BUYING_INTENT_PATTERN.test(text) && INBOX_SHOPPING_VOCABULARY_PATTERN.test(text);
}

function detectInboxGarmentClass(text) {
  return INBOX_GARMENT_CLASS_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];
}
