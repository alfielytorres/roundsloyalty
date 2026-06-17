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
        <div className="max-w-5xl mx-auto">
          {/* Title row */}
          <div className="flex items-center justify-between mb-8">
            <div className="h-9 w-40 bg-gray-200 rounded-xl" />
            <div className="flex gap-3">
              <div className="h-9 w-28 bg-gray-200 rounded-xl" />
              <div className="h-9 w-28 bg-gray-200 rounded-xl" />
            </div>
          </div>

          {/* Segment tabs */}
          <div className="flex gap-3 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={`h-9 w-24 rounded-full animate-pulse ${i === 0 ? 'bg-gray-300' : 'bg-white'}`} />
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="border-b border-gray-100 grid grid-cols-5 px-6 py-4 gap-4">
              {['Customer', 'Visits', 'Stamps', 'Last visit', 'Segment'].map((col) => (
                <div key={col} className="h-4 w-16 bg-gray-100 rounded-lg" />
              ))}
            </div>
            {/* Table rows */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border-b border-gray-50 grid grid-cols-5 px-6 py-4 gap-4 items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 shrink-0" />
                  <div className="h-4 w-24 bg-gray-100 rounded-lg" />
                </div>
                <div className="h-4 w-8 bg-gray-100 rounded-lg" />
                <div className="h-4 w-8 bg-gray-100 rounded-lg" />
                <div className="h-4 w-20 bg-gray-100 rounded-lg" />
                <div className="h-5 w-16 bg-gray-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
