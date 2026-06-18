export default function Loading() {
  return (
    <main className="px-6 pt-10 pb-32 animate-pulse">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="h-8 w-28 bg-white/10 rounded-2xl mb-2" />
          <div className="h-3 w-40 bg-white/5 rounded-lg" />
        </div>
        <div className="bg-white/[.07] border border-white/10 rounded-3xl p-8 mb-4">
          <div className="h-5 w-36 bg-white/10 rounded-xl mb-6" />
          {[0,1,2].map((i) => (
            <div key={i} className="mb-4">
              <div className="h-3 w-24 bg-white/10 rounded-lg mb-2" />
              <div className="h-12 w-full bg-white/10 rounded-2xl" />
            </div>
          ))}
          <div className="h-12 w-36 bg-[#8B5CF6]/20 rounded-2xl mt-2" />
        </div>
        <div className="bg-white/[.07] border border-white/10 rounded-3xl p-8">
          <div className="h-5 w-24 bg-white/10 rounded-xl mb-2" />
          <div className="h-3 w-44 bg-white/5 rounded-lg mb-5" />
          <div className="h-10 w-24 bg-white/10 rounded-xl" />
        </div>
      </div>
    </main>
  )
}
