export default function Loading() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Fake nav */}
      <div className="bg-white border-b border-gray-100 px-8 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div className="h-6 w-28 bg-gray-200 rounded-xl animate-pulse" />
          <div className="flex items-center gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 w-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
        <div className="h-8 w-20 bg-gray-100 rounded-xl animate-pulse" />
      </div>

      {/* Content skeleton */}
      <main className="p-8 animate-pulse">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="mb-8">
            <div className="h-9 w-36 bg-gray-200 rounded-xl mb-2" />
            <div className="h-4 w-48 bg-gray-100 rounded-lg" />
          </div>

          {/* Business details card */}
          <div className="bg-white rounded-3xl p-8 shadow-sm mb-6">
            <div className="h-6 w-40 bg-gray-200 rounded-xl mb-6" />
            <div className="flex flex-col gap-5">
              <div>
                <div className="h-4 w-32 bg-gray-200 rounded-lg mb-2" />
                <div className="h-12 w-full bg-gray-100 rounded-2xl" />
              </div>
              <div>
                <div className="h-4 w-24 bg-gray-200 rounded-lg mb-2" />
                <div className="h-20 w-full bg-gray-100 rounded-2xl" />
              </div>
              <div>
                <div className="h-4 w-20 bg-gray-200 rounded-lg mb-2" />
                <div className="h-12 w-full bg-gray-100 rounded-2xl" />
              </div>
              <div className="pt-2">
                <div className="h-12 w-36 bg-gray-200 rounded-2xl" />
              </div>
            </div>
          </div>

          {/* Account card */}
          <div className="bg-white rounded-3xl p-8 shadow-sm">
            <div className="h-6 w-24 bg-gray-200 rounded-xl mb-2" />
            <div className="h-4 w-48 bg-gray-100 rounded-lg mb-5" />
            <div className="h-10 w-24 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  )
}
