/**
 * Loading skeleton components for improved perceived performance
 */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-slate-700/50 rounded ${className}`}
      role="status"
      aria-label="Loading..."
    />
  );
}

interface FileGridSkeletonProps {
  count?: number;
  viewMode?: 'grid' | 'list' | 'gallery';
  gridSize?: number;
}

export function FileGridSkeleton({ count = 20, viewMode = 'grid', gridSize = 140 }: FileGridSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {items.map(i => (
          <div key={i} className="flex items-center gap-3 p-2 rounded border border-slate-800">
            <Skeleton className="w-10 h-10 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (viewMode === 'gallery') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map(i => (
          <div key={i} className="rounded-lg border border-slate-800 overflow-hidden">
            <Skeleton className="w-full aspect-video" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Grid view
  const cols = Math.floor(800 / (gridSize + 16)); // Approximate columns
  return (
    <div 
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${gridSize}px, 1fr))`,
      }}
    >
      {items.map(i => (
        <div key={i} className="rounded-lg border border-slate-800 overflow-hidden">
          <Skeleton className="w-full aspect-square" />
          <div className="p-2 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ThumbnailSkeletonProps {
  size?: number;
}

export function ThumbnailSkeleton({ size = 140 }: ThumbnailSkeletonProps) {
  return (
    <div 
      className="relative bg-slate-800 rounded overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Skeleton className="w-full h-full" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
      </div>
    </div>
  );
}

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function ProgressBar({ 
  progress, 
  label, 
  showPercentage = true,
  variant = 'default' 
}: ProgressBarProps) {
  const colors = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  const percentage = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm mb-2">
          {label && <span className="text-slate-300">{label}</span>}
          {showPercentage && <span className="text-slate-400">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colors[variant]} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

interface ProgressModalProps {
  isOpen: boolean;
  title: string;
  progress: number;
  current?: number;
  total?: number;
  description?: string;
  onCancel?: () => void;
}

export function ProgressModal({ 
  isOpen, 
  title, 
  progress, 
  current, 
  total,
  description,
  onCancel 
}: ProgressModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        
        {description && (
          <p className="text-sm text-slate-400 mb-4">{description}</p>
        )}

        {current !== undefined && total !== undefined && (
          <p className="text-sm text-slate-300 mb-3">
            Processing: {current} of {total} items
          </p>
        )}

        <ProgressBar 
          progress={progress} 
          showPercentage 
          variant={progress === 100 ? 'success' : 'default'}
        />

        {onCancel && progress < 100 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm rounded bg-slate-800 hover:bg-slate-700 border border-slate-700"
            >
              Cancel
            </button>
          </div>
        )}

        {progress === 100 && (
          <div className="mt-4 text-center text-sm text-green-400">
            ✓ Complete!
          </div>
        )}
      </div>
    </div>
  );
}
