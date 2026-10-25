// Tests for the RAG query matching module.
// Run with: npm test
//
// These tests verify that the RAG layer correctly maps natural language
// queries to curated FAQs WITHOUT altering the safety routing or response
// shape. The Claude API is mocked — no real API calls are made.
//
// Test groups:
//   Group A (tests 1-3) — RAG matching behavior (mocked API)
//   Group B (tests 4-6) — Graceful degradation (no API key, API failure)
//   Group C (tests 7-9) — Safety preservation (sensitive queries still route to helplines)

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// ─── Mock setup ──────────────────────────────────────────────────
// We mock the global fetch to simulate Claude API responses
// without making real network calls.

const originalFetch = globalThis.fetch;
let mockFetchResponse: { ok: boolean; body: string } | null = null;

function mockFetch(_url: string, _options: unknown): Promise<Response> {
  if (!mockFetchResponse) {
    return Promise.reject(new Error("No mock configured"));
  }
  const { ok, body } = mockFetchResponse;
  return Promise.resolve(
    new Response(body, {
      status: ok ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    })
  );
}

beforeEach(() => {
  // Save original env
  delete process.env.ANTHROPIC_API_KEY;
  // Mock fetch
  globalThis.fetch = mockFetch as typeof fetch;
  mockFetchResponse = null;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.ANTHROPIC_API_KEY;
});

// Import after mock setup so the module picks up the mocked fetch
// We use dynamic import to control timing
async function getRagModule() {
  return await import("./rag.ts");
}

// ─── Test FAQs (subset of real data) ─────────────────────────────

const testFaqs = [
  {
    slug: "apply-for-cnic",
    category_en: "Identity Documents",
    category_ur: "شناختی دستاویزات",
    question_en: "How do I apply for a CNIC or NICOP?",
    question_ur: "CNIC یا NICOP کے لیے درخواست کیسے دوں؟",
    answer_en: "Apply at any NADRA registration center.",
    answer_ur: "کسی بھی NADRA رجسٹریشن سنٹر پر درخواست دیں۔",
    tags_en: "cnic,nicop,nadra,identity,card",
    tags_ur: "سند",
  },
  {
    slug: "apply-passport",
    category_en: "Passport & Travel",
    category_ur: "پاسپورٹ اور سفر",
    question_en: "How do I apply for a Pakistani passport?",
    question_ur: "پاکستانی پاسپورٹ کے لیے درخواست کیسے دوں؟",
    answer_en: "Apply at any Regional Passport Office.",
    answer_ur: "کسی بھی پاسپورٹ دفتر پر درخواست دیں۔",
    tags_en: "passport,travel,document",
    tags_ur: "پاسپورٹ",
  },
  {
    slug: "file-fir",
    category_en: "Police & FIR",
    category_ur: "پولیس اور FIR",
    question_en: "How do I file an FIR?",
    question_ur: "FIR کیسے درج کرواؤں؟",
    answer_en: "File at the nearest police station.",
    answer_ur: "قریبی تھانے پر FIR درج کرائیں۔",
    tags_en: "fir,police,crime,report",
    tags_ur: "ایف آئی آر,پولیس",
  },
];

// ═══════════════════════════════════════════════════════════════════════
// Group A — RAG matching behavior (mocked Claude API)
// ═══════════════════════════════════════════════════════════════════════

describe("RAG matching (mocked API)", () => {
  test("A1: Natural language query 'mujhe CNIC banwana hai' matches apply-for-cnic", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    mockFetchResponse = {
      ok: true,
      body: JSON.stringify({
        content: [{ text: '{ "slug": "apply-for-cnic", "confidence": 0.95 }' }],
      }),
    };

    const { matchQueryToFAQ } = await getRagModule();
    const result = await matchQueryToFAQ("mujhe CNIC banwana hai", testFaqs as any, "en");

    assert.ok(result, "should return a match");
    assert.equal(result?.slug, "apply-for-cnic");
    assert.ok(result?.confidence >= 0.5, "confidence should be >= 0.5");
  });

  test("A2: Query 'passport' matches apply-passport", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    mockFetchResponse = {
      ok: true,
      body: JSON.stringify({
        content: [{ text: '{ "slug": "apply-passport", "confidence": 0.88 }' }],
      }),
    };

    const { matchQueryToFAQ } = await getRagModule();
    const result = await matchQueryToFAQ("passport", testFaqs as any, "en");

    assert.ok(result, "should return a match");
    assert.equal(result?.slug, "apply-passport");
  });

  test("A3: Query 'FIR' matches file-fir", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    mockFetchResponse = {
      ok: true,
      body: JSON.stringify({
        content: [{ text: '{ "slug": "file-fir", "confidence": 0.92 }' }],
      }),
    };

    const { matchQueryToFAQ } = await getRagModule();
    const result = await matchQueryToFAQ("FIR", testFaqs as any, "en");

    assert.ok(result, "should return a match");
    assert.equal(result?.slug, "file-fir");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Group B — Graceful degradation
// ═══════════════════════════════════════════════════════════════════════

describe("Graceful degradation", () => {
  test("B1: No API key → returns null", async () => {
    // No ANTHROPIC_API_KEY set
    const { matchQueryToFAQ } = await getRagModule();
    const result = await matchQueryToFAQ("CNIC", testFaqs as any, "en");

    assert.equal(result, null, "should return null when no API key");
  });

  test("B2: API failure (500) → returns null", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    mockFetchResponse = {
      ok: false,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };

    const { matchQueryToFAQ } = await getRagModule();
    const result = await matchQueryToFAQ("CNIC", testFaqs as any, "en");

    assert.equal(result, null, "should return null on API failure");
  });

  test("B3: API returns null slug (no good match) → returns null", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    mockFetchResponse = {
      ok: true,
      body: JSON.stringify({
        content: [{ text: '{ "slug": null, "confidence": 0.1 }' }],
      }),
    };

    const { matchQueryToFAQ } = await getRagModule();
    const result = await matchQueryToFAQ("random unrelated query", testFaqs as any, "en");

    assert.equal(result, null, "should return null when LLM says no match");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Group C — Safety preservation
// These tests verify that RAG does NOT interfere with safety routing.
// The sensitive-topic detection runs independently of RAG.
// ═══════════════════════════════════════════════════════════════════════

describe("Safety preservation", () => {
  test("C1: Sensitive query 'violence' still triggers helpline detection", async () => {
    // RAG would match a hypothetical FAQ, but safety detection is separate
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    mockFetchResponse = {
      ok: true,
      body: JSON.stringify({
        content: [{ text: '{ "slug": null, "confidence": 0.0 }' }],
      }),
    };

    const { matchQueryToFAQ } = await getRagModule();
    const result = await matchQueryToFAQ("violence", testFaqs as any, "en");

    // RAG returns null (no FAQ matches violence), but the caller
    // still runs detectSensitiveTopics separately
    assert.equal(result, null, "RAG should not match sensitive queries to FAQs");

    // Verify safety detection still works independently
    const { detectSensitiveTopics } = await import("./sensitive.ts");
    const sensitiveMatches = await detectSensitiveTopics("violence");
    assert.ok(sensitiveMatches.length > 0, "sensitive detection must still trigger helpline");
    assert.equal(sensitiveMatches[0].helpline.id, 1, "violence → Madadgaar helpline (id 1)");
  });

  test("C2: RAG does not suppress helpline banner for sensitive queries", async () => {
    // Even if RAG somehow matched an FAQ for a sensitive query,
    // the helpline banner is rendered by the route, not by RAG.
    // RAG only affects which FAQ is first in results — safety is orthogonal.
    const { detectSensitiveTopics } = await import("./sensitive.ts");

    const violenceMatches = await detectSensitiveTopics("there is violence in my home");
    assert.ok(violenceMatches.length > 0, "violence must trigger helpline");

    const arrestMatches = await detectSensitiveTopics("my brother was arrested");
    assert.ok(arrestMatches.length > 0, "arrest must trigger helpline");

    const benignMatches = await detectSensitiveTopics("passport");
    assert.equal(benignMatches.length, 0, "benign query must not trigger helpline");
  });

  test("C3: RAG never generates answer text — only returns slug", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-key";
    mockFetchResponse = {
      ok: true,
      body: JSON.stringify({
        content: [
          {
            text: '{ "slug": "apply-for-cnic", "confidence": 0.95 }',
          },
        ],
      }),
    };

    const { matchQueryToFAQ } = await getRagModule();
    const result = await matchQueryToFAQ("CNIC", testFaqs as any, "en");

    // RAG only returns slug + confidence — never answer text
    assert.ok(result, "should return a match");
    assert.equal(typeof result?.slug, "string", "slug should be a string");
    assert.equal(typeof result?.confidence, "number", "confidence should be a number");
    // No answer field — that comes from the DB, not from RAG
    assert.ok(!("answer" in (result ?? {})), "RAG must never return answer text");
  });
});
