export default function Loading() {
  return (
    <div className="px-5 pt-10 pb-32">
      <div className="max-w-2xl mx-auto animate-pulse">
        <div className="h-3 w-20 bg-black/15 rounded-lg mb-1.5" />
        <div className="h-8 w-44 bg-black/15 rounded-xl mb-7" />
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass rounded-3xl p-5 h-24 ">
              <div className="h-8 w-14 bg-black/15 rounded-xl mb-2" />
              <div className="h-3 w-20 bg-black/10 rounded" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-3xl p-5 h-[72px] ">
              <div className="flex items-center gap-3 h-full">
                <div className="w-10 h-10 rounded-2xl bg-black/15 shrink-0" />
                <div>
                  <div className="h-4 w-24 bg-black/15 rounded mb-2" />
                  <div className="h-3 w-32 bg-black/10 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
