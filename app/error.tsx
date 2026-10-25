"use client";

// Error boundary — catches runtime errors in the page and displays
// a visible error message instead of a blank white screen.
//
// Without this, a render-time crash silently wipes the page.
// With it, the user sees what went wrong and can report it.

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for debugging — no user query text is logged here
    console.error("Page error:", error.message);
  }, [error]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="rounded-xl border-2 border-danger bg-danger-light p-6">
        <h1 className="text-xl font-bold text-danger mb-3">
          Something went wrong
        </h1>
        <p className="text-stone-700 mb-4">
          The page encountered an error. This is a bug, not something you did
          wrong.
        </p>
        <p className="text-sm text-stone-500 mb-4 font-mono bg-white/50 rounded p-2 break-all">
          {error.message}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-dark transition-colors"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
