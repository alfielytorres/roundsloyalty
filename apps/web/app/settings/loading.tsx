export default function Loading() {
  return (
    <main className="px-5 pt-10 pb-32 animate-pulse">
      <div className="max-w-lg mx-auto">
        <div className="mb-7">
          <div className="h-3 w-20 bg-[#C8C0B4] rounded-full mb-2" />
          <div className="h-8 w-28 bg-[#B8B0A4] rounded-2xl" />
        </div>
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 mb-4 shadow-sm">
          <div className="h-5 w-36 bg-[#C8C0B4] rounded-xl mb-6" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="mb-4">
              <div className="h-3 w-24 bg-[#D8D0C8] rounded-lg mb-2" />
              <div className="h-12 w-full bg-[#E8E2D9] rounded-2xl" />
            </div>
          ))}
          <div className="h-11 w-36 bg-[#C8C0B4] rounded-2xl mt-2" />
        </div>
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 mb-4 shadow-sm">
          <div className="h-5 w-40 bg-[#C8C0B4] rounded-xl mb-2" />
          <div className="h-3 w-56 bg-[#D8D0C8] rounded-lg mb-5" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="mb-4">
              <div className="h-3 w-32 bg-[#D8D0C8] rounded-lg mb-2" />
              <div className="h-12 w-full bg-[#E8E2D9] rounded-2xl" />
            </div>
          ))}
          <div className="h-11 w-36 bg-[#C8C0B4] rounded-2xl mt-2" />
        </div>
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 shadow-sm">
          <div className="h-5 w-24 bg-[#C8C0B4] rounded-xl mb-2" />
          <div className="h-3 w-44 bg-[#D8D0C8] rounded-lg mb-5" />
          <div className="h-10 w-28 bg-[#E8E2D9] rounded-2xl" />
        </div>
      </div>
    </main>
  )
}
