"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { HelplineBanner } from "@/components/HelplineBanner";
import { Disclaimer } from "@/components/Disclaimer";
import { FAQCard } from "@/components/FAQCard";
import type { ChatResponse, SensitiveMatch } from "@/lib/types";

// Web Speech API types (not in standard TypeScript lib)
interface SpeechRecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

export default function HomePage() {
  const { lang, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [data, setData] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Check for Web Speech API support on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
        .webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
    }
  }, []);

  const fetchResults = useCallback(async (q: string, l: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, lang: l }),
      });
      if (res.ok) {
        const json: ChatResponse = await res.json();
        setData(json);
      }
    } catch {
      // Network error — error boundary handles display
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search as the user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query, lang);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, lang, fetchResults]);

  // Initial load (empty query = show all FAQs)
  useEffect(() => {
    fetchResults("", lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Voice input handler
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
        .webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === "ur" ? "ur-PK" : "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) {
        setQuery(transcript.trim());
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [lang]);

  const sensitive: SensitiveMatch[] = data?.sensitive ?? [];
  const results = data?.results ?? [];
  const followUp = data?.followUp ?? [];
  const topResult = results[0];
  const hasQuery = query.trim().length > 0;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">
          {lang === "en" ? "HaqNama" : "حق نامہ"}
        </h1>
        <LanguageToggle />
      </header>

      <p className="text-stone-600 mb-6 text-base">
        {t(
          "Ask a question about civic procedures in Pakistan. You can type or speak your question.",
          "پاکستان میں شہری طریقوں کے بارے میں سوال پوچھیں۔ آپ ٹائپ کر سکتے ہیں یا بول سکتے ہیں۔"
        )}
      </p>

      {/* Search input with voice button */}
      <div className="mb-6">
        <label htmlFor="search" className="sr-only">
          {t("Search", "تلاش")}
        </label>
        <div className="flex gap-2">
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              "e.g. How do I apply for a CNIC?",
              "مثلاً CNIC کے لیے درخواست کیسے دوں؟"
            )}
            className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            autoComplete="off"
          />
          {voiceSupported && (
            <button
              type="button"
              onClick={startListening}
              disabled={listening}
              aria-label={t("Voice input", "آواز سے داخل کریں")}
              title={listening ? t("Listening...", "سن رہا ہے...") : t("Voice input", "آواز سے داخل کریں")}
              className={`rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                listening
                  ? "bg-danger text-white animate-pulse"
                  : "bg-brand text-white hover:bg-brand-dark"
              }`}
            >
              {listening ? "🎤" : "🎙️"}
            </button>
          )}
        </div>
      </div>

      {/* Sensitive-topic helpline banner — always rendered above answers */}
      <HelplineBanner matches={sensitive} />

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 text-stone-500 text-sm mb-4">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          {t("Searching...", "تلاش جاری ہے...")}
        </div>
      )}

      {/* Results */}
      {results.length > 0 ? (
        <div className="space-y-4 mb-8">
          {results.map((r, idx) => (
            <FAQCard
              key={r.slug}
              category={r.category}
              question={r.question}
              answer={r.answer}
              isTopResult={idx === 0 && hasQuery && r.score > 0}
              aiMatched={idx === 0 && hasQuery && (data?.aiMatched ?? false)}
            />
          ))}
        </div>
      ) : (
        !loading && (
          <p className="text-stone-500 mb-8">
            {t(
              "No matching answers found. Try different keywords or browse all questions below.",
              "کوئی مماثل جواب نہیں ملا۔ مختلف الفاظ آزمائیں یا نیچے تمام سوالات دیکھیں۔"
            )}
          </p>
        )
      )}

      {/* Follow-up suggestions */}
      {followUp.length > 0 && !loading && (
        <div className="mb-8">
          <p className="text-sm text-stone-500 mb-2">
            {t("You might also ask:", "آپ یہ بھی پوچھ سکتے ہیں:")}
          </p>
          <div className="flex flex-wrap gap-2">
            {followUp.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setQuery(suggestion)}
                className="rounded-full border border-brand/30 bg-brand/5 text-brand px-3 py-1.5 text-sm hover:bg-brand/10 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer disclaimer — always visible */}
      {data?.disclaimer && (
        <footer className="mt-8 pt-6 border-t border-stone-200">
          <Disclaimer text={data.disclaimer} />
          <p className="text-xs text-stone-500 mt-3">
            {t(
              "HaqNama provides curated civic information only — it is not a substitute for professional legal advice.",
              "حق نامہ صرف منتخب شہری معلومات فراہم کرتا ہے — یہ پیشہ ورانے قانونی مشورے کا متبادل نہیں ہے۔"
            )}
          </p>
        </footer>
      )}
    </main>
  );
}
