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
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="mb-8">
            <div className="h-9 w-48 bg-gray-200 rounded-xl mb-2" />
            <div className="h-4 w-32 bg-gray-100 rounded-lg" />
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 shadow-sm">
                <div className="h-10 w-20 bg-gray-200 rounded-xl mb-2" />
                <div className="h-4 w-32 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>

          {/* Action cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-200 rounded-3xl p-6">
              <div className="h-6 w-32 bg-gray-300 rounded-xl mb-2" />
              <div className="h-4 w-40 bg-gray-300 rounded-lg" />
            </div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 shadow-sm">
                <div className="h-6 w-32 bg-gray-200 rounded-xl mb-2" />
                <div className="h-4 w-40 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
