import { type FileCategory } from '../lib/fileCategories';

interface CategoryFilterProps {
  categoryFilter: FileCategory | null;
  setCategoryFilter: (category: FileCategory | null) => void;
  categoryCounts: Record<FileCategory, number>;
}

const categoryConfig: Array<{ category: FileCategory; label: string; icon: string; color: string }> = [
  { category: 'image', label: 'Photos', icon: '🖼️', color: 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/50' },
  { category: 'video', label: 'Videos', icon: '🎬', color: 'bg-red-500/20 hover:bg-red-500/30 border-red-500/50' },
  { category: 'audio', label: 'Audio', icon: '🎵', color: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50' },
  { category: 'document', label: 'Documents', icon: '📄', color: 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50' },
  { category: 'archive', label: 'Archives', icon: '📦', color: 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50' },
  { category: 'code', label: 'Code', icon: '💻', color: 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/50' },
];

export default function CategoryFilters({ categoryFilter, setCategoryFilter, categoryCounts }: CategoryFilterProps) {
  const totalFiles = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);

  const handleCategoryClick = (category: FileCategory) => {
    // Toggle: if clicking the same category, turn it off
    if (categoryFilter === category) {
      setCategoryFilter(null);
    } else {
      setCategoryFilter(category);
    }
  };

  return (
    <div className="px-4 py-3 border-t border-white/10">
      <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Quick Access</h3>
      <p className="text-[10px] text-white/40 mb-2">Search in current folder + subfolders</p>
      <div className="space-y-1">
        {/* All Files */}
        <button
          onClick={() => setCategoryFilter(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
            categoryFilter === null
              ? 'bg-white/20 border-white/40 shadow-md'
              : 'bg-white/5 hover:bg-white/10 border-white/10'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">📁</span>
            <span className="text-sm font-medium text-white">All Files</span>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            categoryFilter === null ? 'bg-white/30 text-white' : 'bg-white/10 text-white/70'
          }`}>
            {totalFiles}
          </span>
        </button>

        {/* Category Filters */}
        {categoryConfig.map(({ category, label, icon, color }) => {
          const count = categoryCounts[category] || 0;
          const isActive = categoryFilter === category;
          
          return (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              disabled={count === 0}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                isActive
                  ? `${color} shadow-md`
                  : count === 0
                  ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                  : `bg-white/5 border-white/10 ${color.split(' ')[1]}`
              }`}
              title={isActive ? `Click to deactivate ${label}` : `Show all ${label.toLowerCase()}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{icon}</span>
                <span className="text-sm font-medium text-white">{label}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isActive ? 'bg-white/30 text-white' : 'bg-white/10 text-white/70'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
