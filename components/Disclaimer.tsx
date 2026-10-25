"use client";

// Legal disclaimer — shown on every page and alongside every answer.
// This is a core safety requirement: never present as legal advice.

interface DisclaimerProps {
  text: string;
}

export function Disclaimer({ text }: DisclaimerProps) {
  return (
    <div className="rounded-lg border border-gold bg-gold-light p-3 text-sm text-stone-700">
      <span className="font-bold text-gold" aria-hidden="true">
        ⚖️{" "}
      </span>
      <span>{text}</span>
    </div>
  );
}
