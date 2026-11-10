interface LoadingSkeletonProps {
  rows?: number
  className?: string
}

export function LoadingSkeleton({ rows = 5, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`w-full space-y-3 animate-pulse ${className}`}>
      <div className="h-10 bg-slate-200 rounded-lg w-full"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-8 bg-slate-200 rounded w-1/6"></div>
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-slate-200 rounded w-28"></div>
        <div className="h-8 w-8 bg-slate-200 rounded-lg"></div>
      </div>
      <div className="h-8 bg-slate-200 rounded w-20"></div>
      <div className="h-3 bg-slate-200 rounded w-36"></div>
    </div>
  )
}
