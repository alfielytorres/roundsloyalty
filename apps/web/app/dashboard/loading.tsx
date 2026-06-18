export default function Loading() {
  return (
    <main className="px-6 pt-10 pb-32 animate-pulse">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="h-3 w-24 bg-white/10 rounded-full mb-3" />
          <div className="h-8 w-40 bg-white/10 rounded-2xl" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white/[.07] border border-white/10 rounded-3xl p-5">
              <div className="h-9 w-16 bg-white/10 rounded-xl mb-2" />
              <div className="h-3 w-24 bg-white/5 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <div className="h-20 rounded-3xl bg-[#7DB542]/20" />
          <div className="h-20 rounded-3xl bg-white/[.07] border border-white/10" />
          <div className="h-20 rounded-3xl bg-white/[.07] border border-white/10" />
        </div>
      </div>
    </main>
  )
}
