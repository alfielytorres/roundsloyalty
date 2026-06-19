export default function Loading() {
  return (
    <div className="px-6 pt-10 pb-32">
      <div className="max-w-2xl mx-auto animate-pulse">
        <div className="h-3 w-24 bg-white/10 rounded-lg mb-2" />
        <div className="h-8 w-40 bg-white/10 rounded-xl mb-8" />
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-24" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-16" />
          ))}
        </div>
      </div>
    </div>
  )
}
