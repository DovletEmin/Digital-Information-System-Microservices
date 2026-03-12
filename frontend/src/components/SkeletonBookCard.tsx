export default function SkeletonBookCard() {
  return (
    <div className="animate-pulse">
      {/* Cover */}
      <div className="w-full aspect-[2/3] bg-gray-200 rounded-lg" />
      {/* Info */}
      <div className="mt-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  );
}
