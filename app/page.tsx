export default function Home() {
  return (
    <main className="min-h-screen bg-green-900 text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-5xl font-bold mb-3">
        ♣ Kasaba Bridge Academy ♦
      </h1>

      <p className="text-xl text-green-100 mb-10">
        Learn • Play • Improve
      </p>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button className="rounded-xl bg-green-700 hover:bg-green-600 p-4 text-xl font-semibold transition">
          🎲 Rastgele Eller
        </button>

        <button className="rounded-xl bg-green-700 hover:bg-green-600 p-4 text-xl font-semibold transition">
          ✍️ Dağılım Seç
        </button>

        <button className="rounded-xl bg-green-700 hover:bg-green-600 p-4 text-xl font-semibold transition">
          📚 Dersler
        </button>

        <button className="rounded-xl bg-green-700 hover:bg-green-600 p-4 text-xl font-semibold transition">
          📖 Konvansiyonlar
        </button>
      </div>

      <footer className="mt-12 text-green-200 text-sm mt-10">
        © 2026 Kasaba Bridge Academy
      </footer>
    </main>
  );
}
