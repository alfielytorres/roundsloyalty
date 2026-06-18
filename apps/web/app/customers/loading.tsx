export default function Loading() {
  return (
    <main className="px-6 pt-10 pb-32 animate-pulse">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="h-8 w-36 bg-white/10 rounded-2xl" />
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-white/10 rounded-xl" />
            <div className="h-9 w-24 bg-white/10 rounded-xl" />
          </div>
        </div>
        <div className="flex gap-2 mb-6">
          {[0,1,2,3].map((i) => (
            <div key={i} className={`h-9 w-24 rounded-full ${i === 0 ? 'bg-[#7DB542]/20' : 'bg-white/[.07]'}`} />
          ))}
        </div>
        <div className="bg-white/[.07] border border-white/10 rounded-3xl overflow-hidden">
          <div className="border-b border-white/10 px-6 py-4 flex gap-6">
            {[140,60,60,80,80].map((w, i) => <div key={i} className="h-3 bg-white/10 rounded-lg" style={{width: w}} />)}
          </div>
          {[0,1,2,3,4].map((i) => (
            <div key={i} className="border-b border-white/5 px-6 py-4 flex items-center gap-6">
              <div className="flex items-center gap-3 w-36">
                <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
                <div className="h-4 w-20 bg-white/10 rounded-lg" />
              </div>
              <div className="h-4 w-8 bg-white/10 rounded-lg" />
              <div className="h-4 w-8 bg-white/10 rounded-lg" />
              <div className="h-4 w-20 bg-white/10 rounded-lg" />
              <div className="h-5 w-16 bg-white/10 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
