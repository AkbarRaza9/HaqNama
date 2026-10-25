// POST /api/chat
// AI-enhanced query matching — uses Claude to semantically match a user's
// natural language query to the best curated FAQ. The LLM never generates
// answers; it only returns the slug of the best-matching FAQ. The actual
// answer text comes from the curated knowledge base in SQLite.
//
// This preserves HaqNama's safety model:
//   - Answers are always human-approved text from the DB
//   - Sensitive-topic detection still runs (Net 1 → Net 2 → Net 3 fallback)
//   - No AI-generated legal content ever reaches the user
//
// If ANTHROPIC_API_KEY is missing or the Claude call fails, the route
// falls back to the existing keyword-based /api/search behavior so the
// user always gets a result.

import { NextRequest, NextResponse } from "next/server";
import { getDisclaimer } from "@/lib/db";
import { detectSensitiveTopics } from "@/lib/sensitive";
import { searchFAQs } from "@/lib/search";
import { langSchema } from "@/lib/validation";
import type { ChatResponse, Helpline, Lang, SensitiveMatch } from "@/lib/types";

export const dynamic = "force-dynamic";

// ─── P0 fallback data (same as /api/search) ─────────────────────
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

/**
 * Call Claude API to find the best matching FAQ slug.
 * Returns null if the API key is missing or the call fails.
 */
async function matchWithClaude(
  query: string,
  faqs: Array<{ slug: string; question_en: string; question_ur: string; tags_en: string | null; tags_ur: string | null }>,
  lang: Lang
): Promise<{ slug: string; confidence: number; followUp: string[] } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  // Build a compact FAQ list for the LLM context
  const faqList = faqs
    .map((f) => {
      const q = lang === "en" ? f.question_en : f.question_ur;
      const tags = lang === "en" ? f.tags_en : f.tags_ur;
      return `- slug: "${f.slug}"\n  question: "${q}"\n  tags: "${tags ?? ""}"`;
    })
    .join("\n");

  const systemPrompt = `You are a query matcher for HaqNama, a Pakistani civic legal information assistant.
Given a user query and a list of FAQs, return the slug of the best matching FAQ.
If no FAQ matches well (confidence < 0.3), set slug to null.
Also suggest 2-3 follow-up questions the user might ask next (in ${lang === "ur" ? "Urdu" : "English"}).

IMPORTANT: You do NOT generate answers. You only match queries to FAQs.
The user's query may be in Urdu, English, Roman Urdu, or a mix.

Respond ONLY with valid JSON in this exact format:
{ "slug": "...", "confidence": 0.0, "followUp": ["...", "..."] }`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Query: "${query}"\n\nFAQs:\n${faqList}`,
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;

    // Parse JSON from the response (handle potential markdown code fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      slug: parsed.slug || null,
      confidence: Math.min(Math.max(parsed.confidence ?? 0, 0), 1),
      followUp: Array.isArray(parsed.followUp) ? parsed.followUp.slice(0, 3) : [],
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let body: { q?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate input
  const q = typeof body.q === "string" ? body.q : "";
  const langResult = langSchema.safeParse(body.lang ?? "en");
  const lang = langResult.success ? langResult.data : "en";

  // Length check (same security requirement as /api/search)
  if (q.length > 500) {
    return NextResponse.json({ error: "Query too long (max 500 chars)" }, { status: 400 });
  }

  const trimmedQuery = q.trim();

  // Run sensitive-topic detection (never fails — P0 fallback built in)
  let sensitive: SensitiveMatch[];
  try {
    sensitive = await detectSensitiveTopics(trimmedQuery);
  } catch {
    sensitive = buildFallbackSensitive();
  }

  // Get disclaimer
  let disclaimer: string;
  try {
    disclaimer = getDisclaimer(lang);
  } catch {
    disclaimer = FALLBACK_DISCLAIMER[lang];
  }
  if (!disclaimer) disclaimer = FALLBACK_DISCLAIMER[lang];

  // Try AI matching first
  const { getAllFAQs } = await import("@/lib/db");
  const allFaqs = getAllFAQs();

  const matchResult = await matchWithClaude(trimmedQuery, allFaqs, lang);

  // Build results: if AI matched a specific FAQ, show it first; then fallbacks
  let results: Array<{ slug: string; category: string; question: string; answer: string; score: number }> = [];
  let matchedSlug: string | null = null;
  let confidence = 0;
  let aiMatched = false;
  let followUp: string[] = [];

  if (matchResult?.slug) {
    // AI found a match — look up the FAQ from DB
    const matchedFaq = allFaqs.find((f) => f.slug === matchResult.slug);
    if (matchedFaq) {
      results = [
        {
          slug: matchedFaq.slug,
          category: lang === "en" ? matchedFaq.category_en : matchedFaq.category_ur,
          question: lang === "en" ? matchedFaq.question_en : matchedFaq.question_ur,
          answer: lang === "en" ? matchedFaq.answer_en : matchedFaq.answer_ur,
          score: Math.round(matchResult.confidence * 100),
        },
      ];
      matchedSlug = matchedFaq.slug;
      confidence = matchResult.confidence;
      followUp = matchResult.followUp;
      aiMatched = true;

      // Add remaining FAQs as lower-priority fallbacks
      const remaining = searchFAQs(trimmedQuery, lang)
        .filter((r) => r.slug !== matchedSlug)
        .map((r) => ({
          slug: r.slug,
          category: lang === "en" ? r.category_en : r.category_ur,
          question: lang === "en" ? r.question_en : r.question_ur,
          answer: lang === "en" ? r.answer_en : r.answer_ur,
          score: r.score,
        }));
      results.push(...remaining);
    }
  }

  // Fallback: if AI didn't match or failed, use keyword search
  if (results.length === 0) {
    const keywordResults = searchFAQs(trimmedQuery, lang);
    results = keywordResults.map((r) => ({
      slug: r.slug,
      category: lang === "en" ? r.category_en : r.category_ur,
      question: lang === "en" ? r.question_en : r.question_ur,
      answer: lang === "en" ? r.answer_en : r.answer_ur,
      score: r.score,
    }));
  }

  // If still no results (empty query), show all FAQs
  if (results.length === 0) {
    results = allFaqs.map((f) => ({
      slug: f.slug,
      category: lang === "en" ? f.category_en : f.category_ur,
      question: lang === "en" ? f.question_en : f.question_ur,
      answer: lang === "en" ? f.answer_en : f.answer_ur,
      score: 0,
    }));
  }

  const response: ChatResponse = {
    lang,
    query: trimmedQuery,
    disclaimer,
    sensitive: sensitive.map((s) => ({
      keyword: s.keyword,
      helpline: s.helpline,
    })),
    results,
    followUp,
    confidence,
    matchedSlug,
    aiMatched,
  };

  return NextResponse.json(response);
}
