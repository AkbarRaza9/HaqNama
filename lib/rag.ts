// RAG (Retrieval-Augmented Generation) query matching.
//
// Uses Claude to semantically match a natural language query to the best
// curated FAQ. The LLM ONLY returns the matching FAQ slug — it never
// generates answers. The actual answer text always comes from the curated
// knowledge base in SQLite.
//
// This module is designed to be called from inside the existing /api/search
// route as an internal enhancement. If the API key is missing or the call
// fails, it returns null and the caller falls back to keyword search.
//
// Safety: this module does NOT handle sensitive-topic detection. The caller
// must still run detectSensitiveTopics separately. RAG only improves
// matching — it never replaces the safety layer.

import type { FAQ, Lang } from "./types";

/**
 * Match a natural language query to the best FAQ using Claude.
 * Returns null if no API key is configured or the call fails.
 */
export async function matchQueryToFAQ(
  query: string,
  faqs: FAQ[],
  lang: Lang
): Promise<{ slug: string; confidence: number } | null> {
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

IMPORTANT: You do NOT generate answers. You only match queries to FAQs.
The user's query may be in Urdu, English, Roman Urdu, or a mix.
The query may be a paraphrase, not an exact keyword match.

Respond ONLY with valid JSON in this exact format:
{ "slug": "...", "confidence": 0.0 }`;

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
        max_tokens: 100,
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
    if (!parsed.slug) return null;

    return {
      slug: parsed.slug,
      confidence: Math.min(Math.max(parsed.confidence ?? 0, 0), 1),
    };
  } catch {
    return null;
  }
}
