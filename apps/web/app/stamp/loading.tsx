export default function Loading() {
  return (
    <main className="px-5 pt-10 pb-32 animate-pulse">
      <div className="max-w-lg mx-auto">
        <div className="mb-7">
          <div className="h-3 w-24 bg-[#C8C0B4] rounded-full mb-2" />
          <div className="h-8 w-32 bg-[#B8B0A4] rounded-2xl" />
        </div>
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 shadow-sm">
          <div className="h-5 w-48 bg-[#C8C0B4] rounded-xl mb-2" />
          <div className="h-3 w-64 bg-[#D8D0C8] rounded-lg mb-6" />
          <div className="h-12 w-full bg-[#E8E2D9] rounded-2xl mb-4" />
          <div className="flex gap-2 mb-4">
            <div className="flex-1 h-11 bg-[#E8E2D9] rounded-2xl" />
            <div className="flex-1 h-11 bg-[#E8E2D9] rounded-2xl" />
          </div>
          <div className="flex gap-2 mb-5">
            {[0, 1, 2, 3].map((i) => <div key={i} className="w-12 h-12 bg-[#E8E2D9] rounded-2xl" />)}
          </div>
          <div className="h-12 w-full bg-[#C8C0B4] rounded-2xl" />
        </div>
        <div className="mt-7">
          <div className="h-5 w-28 bg-[#C8C0B4] rounded-xl mb-3" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white border border-[#E8E2D9] rounded-2xl px-5 py-3 flex items-center justify-between mb-2 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E8E2D9]" />
                <div className="h-4 w-28 bg-[#C8C0B4] rounded-lg" />
              </div>
              <div className="h-3 w-16 bg-[#D8D0C8] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
