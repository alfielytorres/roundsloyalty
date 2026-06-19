export default function Loading() {
  return (
    <div className="px-5 pt-10 pb-32">
      <div className="max-w-2xl mx-auto animate-pulse">
        <div className="h-3 w-20 bg-[#E8E2D9] rounded-lg mb-1.5" />
        <div className="h-8 w-44 bg-[#E8E2D9] rounded-xl mb-7" />
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E8E2D9] rounded-3xl p-5 h-24 shadow-sm" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E8E2D9] rounded-3xl p-5 h-[72px] shadow-sm" />
          ))}
        </div>
      </div>
    </div>
  )
}
