export default function SkeletonCard() {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 animate-pulse">
      <div className="flex flex-col lg:flex-row gap-6 p-6 lg:p-7">
        <div className="flex-1 flex flex-col min-w-0">
          {/* Meta */}
          <div className="flex items-center gap-2 mb-4">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-4" />
            <div className="h-4 bg-gray-200 rounded w-40" />
          </div>
          {/* Title */}
          <div className="h-7 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-7 bg-gray-200 rounded w-1/2 mb-4" />
          {/* Excerpt */}
          <div className="h-4 bg-gray-200 rounded w-full mb-2" />
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-6" />
          {/* Footer */}
          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-4 bg-gray-200 rounded w-20" />
              <div className="h-4 bg-gray-200 rounded w-12" />
              <div className="h-4 bg-gray-200 rounded w-12" />
            </div>
            <div className="h-9 bg-gray-200 rounded-full w-32" />
          </div>
        </div>
        {/* Image placeholder */}
        <div className="w-full lg:w-64 xl:w-72 aspect-[4/3] flex-shrink-0 bg-gray-200 rounded-xl lg:order-last" />
      </div>
    </article>
  );
}
