export default function MasaPage() {
  return (
    <main className="min-h-screen bg-green-700 flex items-center justify-center">
      <div className="relative w-[900px] h-[600px] rounded-full bg-green-800 border-8 border-amber-700 shadow-2xl">

        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white font-bold">
          KUZEY
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-bold">
          GÜNEY
        </div>

        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white font-bold">
          BATI
        </div>

        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white font-bold">
          DOĞU
        </div>

        <div className="absolute inset-0 flex items-center justify-center text-white text-3xl font-bold">
          KASABALILAR BRİÇ MASASI
        </div>

      </div>
    </main>
  );
}