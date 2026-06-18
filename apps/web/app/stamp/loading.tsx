export default function Loading() {
  return (
    <main className="px-6 pt-10 pb-32 animate-pulse">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="h-3 w-24 bg-white/10 rounded-full mb-3" />
          <div className="h-8 w-32 bg-white/10 rounded-2xl" />
        </div>
        <div className="bg-white/[.07] border border-white/10 rounded-3xl p-8">
          <div className="h-5 w-48 bg-white/10 rounded-xl mb-2" />
          <div className="h-3 w-64 bg-white/5 rounded-lg mb-6" />
          <div className="h-12 w-full bg-white/10 rounded-2xl mb-3" />
          <div className="flex gap-2 mb-4">
            {[0,1,2,3].map((i) => <div key={i} className="w-12 h-12 bg-white/10 rounded-2xl" />)}
          </div>
          <div className="h-12 w-full bg-[#7DB542]/20 rounded-2xl" />
        </div>
        <div className="mt-8">
          <div className="h-4 w-28 bg-white/10 rounded-xl mb-3" />
          {[0,1,2,3].map((i) => (
            <div key={i} className="bg-white/[.07] border border-white/10 rounded-2xl px-5 py-3 flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10" />
                <div className="h-4 w-28 bg-white/10 rounded-lg" />
              </div>
              <div className="h-3 w-12 bg-white/5 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
