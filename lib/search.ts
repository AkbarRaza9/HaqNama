// FAQ search engine.
//
// For the MVP (10 curated FAQs) we use a simple tag + keyword overlap
// scorer — no vector embeddings, no external service. This keeps the
// app fully self-contained and deployable on free-tier Vercel.
//
// Scoring: each query token that appears in an FAQ's tags or question
// earns 1 point. We return all FAQs sorted by score so the user sees
// the most relevant answer first, with lower-scored fallbacks below.

import { getAllFAQs } from "./db";
import type { FAQ, Lang, SearchResult } from "./types";

const globalForFaqs = globalThis as unknown as {
  __haqnamaFaqCache?: FAQ[];
};

function getFaqCache(): FAQ[] {
  if (!globalForFaqs.__haqnamaFaqCache) {
    globalForFaqs.__haqnamaFaqCache = getAllFAQs();
  }
  return globalForFaqs.__haqnamaFaqCache;
}

/**
 * Tokenize a query into lowercase word tokens.
 * Handles both English (space-separated) and Urdu (space-separated) text.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,،.؟?!"'()]+/u)
    .filter((t) => t.length > 1);
}

/**
 * Score a single FAQ against a query.
 * Higher score = better match.
 */
function scoreFaq(faq: FAQ, queryTokens: string[], lang: Lang): number {
  const tagsField = lang === "en" ? faq.tags_en : faq.tags_ur;
  const questionField = lang === "en" ? faq.question_en : faq.question_ur;
  const categoryField = lang === "en" ? faq.category_en : faq.category_ur;

  const tagTokens = (tagsField ?? "").toLowerCase().split(/[,\s]+/);
  const questionTokens = tokenize(questionField);
  const categoryTokens = tokenize(categoryField);

  let score = 0;
  for (const qt of queryTokens) {
    // Tag matches are strongest signal
    if (tagTokens.includes(qt)) score += 3;
    // Question text matches
    if (questionTokens.includes(qt)) score += 2;
    // Category matches (weaker)
    if (categoryTokens.includes(qt)) score += 1;
  }

  return score;
}

/**
 * Search FAQs for a query in the given language.
 * Returns all FAQs sorted by relevance (highest first).
 * An empty query returns all FAQs in their default sort order.
 */
export function searchFAQs(
  query: string,
  lang: Lang
): SearchResult[] {
  const faqs = getFaqCache();

  if (!query.trim()) {
    return faqs.map((f) => ({ ...f, score: 0 }));
  }

  const queryTokens = tokenize(query);

  return faqs
    .map((faq) => ({ ...faq, score: scoreFaq(faq, queryTokens, lang) }))
    .sort((a, b) => b.score - a.score);
}
