// Loading state shown while the page fetches data.
// Prevents layout shift and gives the user immediate feedback.

export default function Loading() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-dark">HaqNama</h1>
      </header>
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-stone-200 rounded-xl" />
        <div className="h-24 bg-stone-200 rounded-xl" />
        <div className="h-24 bg-stone-200 rounded-xl" />
        <div className="h-24 bg-stone-200 rounded-xl" />
      </div>
    </main>
  );
}
