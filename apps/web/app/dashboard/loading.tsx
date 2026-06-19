export default function Loading() {
  return (
    <main className="px-6 pt-10 pb-32 animate-pulse">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="h-3 w-24 bg-[#C8C0B4] rounded-full mb-3" />
          <div className="h-8 w-40 bg-[#B8B0A4] rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white border border-[#E8E2D9] rounded-3xl p-5 shadow-sm">
              <div className="h-9 w-16 bg-[#C8C0B4] rounded-xl mb-3" />
              <div className="h-3 w-24 bg-[#D8D0C8] rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <div className="h-20 rounded-3xl bg-[#C8C0B4]" />
          <div className="h-20 rounded-3xl bg-white border border-[#E8E2D9] shadow-sm" />
          <div className="h-20 rounded-3xl bg-white border border-[#E8E2D9] shadow-sm" />
          <div className="h-20 rounded-3xl bg-white border border-[#E8E2D9] shadow-sm" />
        </div>
      </div>
    </main>
  )
}
