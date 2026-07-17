import Link from "next/link";

export default function YakindaPage() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold text-red-600">
          Çok Yakında
        </h1>

        <p className="mt-8 text-2xl text-zinc-300 leading-10">
          Kasabalılar Bridge Academy'nin bu bölümü
          şu anda geliştirme aşamasında.
        </p>

        <p className="mt-6 text-lg text-zinc-500">
          Bir sonraki dağıtımda tekrar bekleriz. ♣ ♥ ♠ ♦
        </p>

        <Link
          href="/salon"
          className="inline-block mt-12 bg-red-700 hover:bg-red-600 rounded-xl px-8 py-3 font-bold transition"
        >
          SALONA DÖN
        </Link>
      </div>
    </main>
  );
}