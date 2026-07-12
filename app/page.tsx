import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-green-800 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-green-700 rounded-2xl shadow-2xl p-10 text-center text-white">
        <h1 className="text-5xl font-bold mb-4">
          KASABALILAR
        </h1>

        <h2 className="text-2xl mb-8">
          BRİÇ KULÜBÜ
        </h2>

        <p className="text-lg mb-8">
          Dostlarla briç oynamanın yeni adresi.
        </p>

        <Link
  href="/masa"
  className="inline-block bg-white text-green-800 font-bold px-8 py-3 rounded-full hover:scale-105 transition"
>
  MASAYA OTUR
</Link>      </div>
    </main>
  );
}


