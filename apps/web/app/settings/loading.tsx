export default function Loading() {
  return (
    <main className="px-5 pt-10 pb-32 animate-pulse">
      <div className="max-w-lg mx-auto">
        <div className="mb-7">
          <div className="h-3 w-20 bg-black/15 rounded-full mb-2" />
          <div className="h-8 w-28 bg-black/15 rounded-2xl" />
        </div>
        <div className="glass rounded-3xl p-6 mb-4 ">
          <div className="h-5 w-36 bg-black/15 rounded-xl mb-6" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="mb-4">
              <div className="h-3 w-24 bg-black/10 rounded-lg mb-2" />
              <div className="h-12 w-full bg-black/10 rounded-2xl" />
            </div>
          ))}
          <div className="h-11 w-36 bg-black/15 rounded-2xl mt-2" />
        </div>
        <div className="glass rounded-3xl p-6 mb-4 ">
          <div className="h-5 w-40 bg-black/15 rounded-xl mb-2" />
          <div className="h-3 w-56 bg-black/10 rounded-lg mb-5" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="mb-4">
              <div className="h-3 w-32 bg-black/10 rounded-lg mb-2" />
              <div className="h-12 w-full bg-black/10 rounded-2xl" />
            </div>
          ))}
          <div className="h-11 w-36 bg-black/15 rounded-2xl mt-2" />
        </div>
        <div className="glass rounded-3xl p-6 ">
          <div className="h-5 w-24 bg-black/15 rounded-xl mb-2" />
          <div className="h-3 w-44 bg-black/10 rounded-lg mb-5" />
          <div className="h-10 w-28 bg-black/10 rounded-2xl" />
        </div>
      </div>
    </main>
  )
}
