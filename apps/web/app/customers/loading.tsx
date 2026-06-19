export default function Loading() {
  return (
    <main className="px-5 pt-10 pb-32 animate-pulse">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-7">
          <div>
            <div className="h-3 w-20 bg-black/15 rounded-full mb-2" />
            <div className="h-8 w-36 bg-black/15 rounded-2xl" />
          </div>
          <div className="flex gap-2 mt-1">
            <div className="h-9 w-16 bg-black/10 rounded-xl" />
            <div className="h-9 w-16 bg-black/10 rounded-xl" />
          </div>
        </div>
        <div className="flex gap-2 mb-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-black/10" />
          ))}
        </div>
        <div className="glass rounded-3xl overflow-hidden ">
          <div className="border-b border-black/5 px-6 py-4 flex gap-6">
            {[140, 60, 60, 60, 80].map((w, i) => (
              <div key={i} className="h-3 bg-black/15 rounded-lg" style={{ width: w }} />
            ))}
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-b border-black/5 px-6 py-4 flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-black/10 shrink-0" />
                <div className="h-4 w-24 bg-black/15 rounded-lg" />
              </div>
              <div className="h-5 w-16 bg-black/10 rounded-full ml-4" />
              <div className="h-4 w-8 bg-black/10 rounded-lg ml-2" />
              <div className="h-4 w-8 bg-black/10 rounded-lg ml-2" />
              <div className="h-4 w-20 bg-black/10 rounded-lg ml-2" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
