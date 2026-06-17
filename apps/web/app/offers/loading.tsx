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
          {/* Title */}
          <div className="mb-8">
            <div className="h-9 w-40 bg-gray-200 rounded-xl mb-2" />
            <div className="h-4 w-56 bg-gray-100 rounded-lg" />
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Compose form (left) */}
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="h-6 w-28 bg-gray-200 rounded-xl mb-6" />
              <div className="flex flex-col gap-5">
                <div>
                  <div className="h-4 w-12 bg-gray-200 rounded-lg mb-2" />
                  <div className="h-12 w-full bg-gray-100 rounded-2xl" />
                </div>
                <div>
                  <div className="h-4 w-20 bg-gray-200 rounded-lg mb-2" />
                  <div className="h-28 w-full bg-gray-100 rounded-2xl" />
                </div>
                <div>
                  <div className="h-4 w-16 bg-gray-200 rounded-lg mb-2" />
                  <div className="h-12 w-full bg-gray-100 rounded-2xl" />
                </div>
                <div className="h-12 w-full bg-gray-200 rounded-2xl" />
              </div>
            </div>

            {/* Past offers (right) */}
            <div>
              <div className="h-6 w-28 bg-gray-200 rounded-xl mb-4" />
              <div className="flex flex-col gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl px-6 py-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="h-5 w-40 bg-gray-200 rounded-lg mb-2" />
                        <div className="h-4 w-full bg-gray-100 rounded-lg" />
                      </div>
                      <div className="h-6 w-16 bg-gray-100 rounded-full shrink-0" />
                    </div>
                    <div className="flex gap-3 mt-2">
                      <div className="h-4 w-20 bg-gray-100 rounded-md" />
                      <div className="h-4 w-16 bg-gray-100 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
