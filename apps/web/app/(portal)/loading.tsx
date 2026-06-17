export default function Loading() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-2xl mb-3" />
        <div className="h-4 w-32 bg-gray-100 rounded-xl mb-10" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-6 h-32" />
          ))}
        </div>
      </div>
    </div>
  )
}
