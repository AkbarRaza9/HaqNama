// GET /api/search?q=<query>&lang=en|ur
// Returns matching FAQs in the requested language, plus any sensitive-topic
// helpline matches detected from the query.
//
// Matching strategy (in order):
//   1. RAG matching (if ANTHROPIC_API_KEY is set): Claude semantically matches
//      the query to the best FAQ. If confidence ≥ 0.5, that FAQ is placed
//      first in results.
//   2. Keyword matching (always runs): tag + keyword overlap scoring.
//      If RAG already placed a match first, keyword results fill in the rest.
//   3. Empty query returns all FAQs in default order.
//
// The response shape (SearchResponse) never changes — RAG only affects
// which FAQ appears first in the results array.
//
// Safety (§7.4 P0): if sensitive-topic detection throws or times out,
// the response includes the 1099 helpline as a fallback. FAQ results may
// still be returned, but the banner is always present on error.

import { NextRequest, NextResponse } from "next/server";
import { getAllFAQs, getDisclaimer } from "@/lib/db";
import { detectSensitiveTopics } from "@/lib/sensitive";
import { searchFAQs } from "@/lib/search";
import { matchQueryToFAQ } from "@/lib/rag";
import { searchQuerySchema } from "@/lib/validation";
import type { Helpline, Lang, SearchResponse, SensitiveMatch } from "@/lib/types";

export const dynamic = "force-dynamic";

// ─── P0 fallback data — hardcoded, never touches the DB ───────────
// §7.4: if detection fails AND the DB is the thing that broke, the
// fallback must still render the 1099 banner. So these values are
// inlined here and returned unconditionally.

const FALLBACK_HELPLINE: Helpline = {
  id: 3,
  name_en: "Ministry of Human Rights Helpline",
  name_ur: "انسانی حقوق وزارت ہیلپ لین",
  number: "1099",
  hours_en: "24 hours, 7 days",
  hours_ur: "24 گھنٹے، 7 دن",
  notes_en: "For human rights violations including unlawful detention.",
  notes_ur: "انسانی حقوق کی خلاف ورزیوں بشمول غیر قانونی حراست کے لیے۔",
};

const FALLBACK_DISCLAIMER: Record<Lang, string> = {
  en: "This information is provided for general educational purposes only and does not constitute legal advice. For advice specific to your situation, please consult a qualified lawyer or contact the helpline shown above.",
  ur: "یہ معلومات صرف عام تعلیمی مقاصد کے لیے فراہم کی گئی ہیں اور قانونی مشورے کی جگہ نہیں لیتیں۔ اپنی صورت حال کے لیے مخصوص رہنمائی کے لیے براہ کرم کسی مستند وکیل سے رابطہ کریں یا اوپر دکھائے گئے ہیلپ لین پر کال کریں۔",
};

function buildFallbackSensitive(): SensitiveMatch[] {
  return [{ keyword: "__fallback__", helpline: FALLBACK_HELPLINE }];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Validate input via Zod — mandatory security requirement
  const parsed = searchQuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
    lang: searchParams.get("lang") ?? "en",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { q: query, lang } = parsed.data;
  const trimmedQuery = query.trim();

  // Run sensitive-topic detection (never fails — P0 fallback built in)
  let sensitive: SensitiveMatch[];
  try {
    sensitive = await detectSensitiveTopics(trimmedQuery);
  } catch {
    sensitive = buildFallbackSensitive();
  }

  // Get disclaimer (with P0 fallback)
  let disclaimer: string;
  try {
    disclaimer = getDisclaimer(lang);
  } catch {
    disclaimer = FALLBACK_DISCLAIMER[lang];
  }
  if (!disclaimer) disclaimer = FALLBACK_DISCLAIMER[lang];

  // Build results array
  const allFaqs = getAllFAQs();
  let results: Array<{ slug: string; category: string; question: string; answer: string; score: number }> = [];

  // Step 1: Try RAG matching (if API key is present)
  let ragMatchedSlug: string | null = null;
  if (trimmedQuery.length > 0) {
    try {
      const ragResult = await matchQueryToFAQ(trimmedQuery, allFaqs, lang);
      if (ragResult && ragResult.confidence >= 0.5) {
        const matchedFaq = allFaqs.find((f) => f.slug === ragResult.slug);
        if (matchedFaq) {
          results.push({
            slug: matchedFaq.slug,
            category: lang === "en" ? matchedFaq.category_en : matchedFaq.category_ur,
            question: lang === "en" ? matchedFaq.question_en : matchedFaq.question_ur,
            answer: lang === "en" ? matchedFaq.answer_en : matchedFaq.answer_ur,
            score: Math.round(ragResult.confidence * 100),
          });
          ragMatchedSlug = matchedFaq.slug;
        }
      }
    } catch {
      // RAG failed — fall through to keyword search
    }
  }

  // Step 2: Keyword search (always runs — fills in results or provides fallback)
  const keywordResults = searchFAQs(trimmedQuery, lang);
  for (const r of keywordResults) {
    // Skip the FAQ that RAG already placed first (avoid duplicates)
    if (r.slug === ragMatchedSlug) continue;
    results.push({
      slug: r.slug,
      category: lang === "en" ? r.category_en : r.category_ur,
      question: lang === "en" ? r.question_en : r.question_ur,
      answer: lang === "en" ? r.answer_en : r.answer_ur,
      score: r.score,
    });
  }

  // Step 3: If still no results (empty query), show all FAQs in default order
  if (results.length === 0) {
    results = allFaqs.map((f) => ({
      slug: f.slug,
      category: lang === "en" ? f.category_en : f.category_ur,
      question: lang === "en" ? f.question_en : f.question_ur,
      answer: lang === "en" ? f.answer_en : f.answer_ur,
      score: 0,
    }));
  }

  const response: SearchResponse = {
    lang,
    query: trimmedQuery,
    disclaimer,
    sensitive: sensitive.map((s) => ({
      keyword: s.keyword,
      helpline: s.helpline,
    })),
    results,
  };

  return NextResponse.json(response);
}
