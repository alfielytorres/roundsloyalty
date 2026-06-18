export default function Loading() {
  return (
    <main className="px-6 pt-10 pb-32 animate-pulse">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-32 bg-white/10 rounded-2xl mb-2" />
          <div className="h-3 w-48 bg-white/5 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/[.07] border border-white/10 rounded-3xl p-8">
            <div className="h-5 w-28 bg-white/10 rounded-xl mb-6" />
            {[0,1,2].map((i) => (
              <div key={i} className="mb-4">
                <div className="h-3 w-16 bg-white/10 rounded-lg mb-2" />
                <div className="h-12 w-full bg-white/10 rounded-2xl" />
              </div>
            ))}
            <div className="h-12 w-full bg-[#7DB542]/20 rounded-2xl mt-2" />
          </div>
          <div>
            <div className="h-5 w-28 bg-white/10 rounded-xl mb-4" />
            {[0,1,2].map((i) => (
              <div key={i} className="bg-white/[.07] border border-white/10 rounded-2xl px-5 py-4 mb-3">
                <div className="h-4 w-40 bg-white/10 rounded-lg mb-2" />
                <div className="h-3 w-full bg-white/5 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
