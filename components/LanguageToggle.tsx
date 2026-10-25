"use client";

import { useLanguage } from "./LanguageContext";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className="inline-flex rounded-lg border border-stone-300 bg-white overflow-hidden"
      role="group"
      aria-label="Language toggle"
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`px-3 py-1.5 text-sm font-medium transition-colors ${
          lang === "en"
            ? "bg-brand text-white"
            : "text-stone-600 hover:bg-stone-100"
        }`}
        aria-pressed={lang === "en"}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLang("ur")}
        className={`px-3 py-1.5 text-sm font-medium transition-colors ${
          lang === "ur"
            ? "bg-brand text-white"
            : "text-stone-600 hover:bg-stone-100"
        }`}
        aria-pressed={lang === "ur"}
      >
        اردو
      </button>
    </div>
  );
}
