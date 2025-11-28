import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileItem } from '../AppTypes';
import {
  searchFiles,
  buildSearchIndex,
  filterSearchResults,
  MetadataStore,
  type SearchIndex,
  type SearchFilters,
  type SearchResult,
} from '../lib/symenthaSearch';
import { formatBytes } from '../lib/formatBytes';

interface ContentSearchUIProps {
  files: FileItem[];
  onSelectFile?: (file: FileItem) => void;
  containerHeight?: number;
}

/**
 * Content Search & Tagging UI Component
 * Enables full-text search with smart filters and automatic tagging
 */
export const ContentSearchUI: React.FC<ContentSearchUIProps> = ({
  files,
  onSelectFile,
  containerHeight = 600,
}) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchIndex, setSearchIndex] = useState<SearchIndex[]>([]);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedExtensions, setSelectedExtensions] = useState<Set<string>>(new Set());
  const [minSize, setMinSize] = useState<number>(0);
  const [maxSize, setMaxSize] = useState<number>(Number.MAX_SAFE_INTEGER);

  // Initialize search index on mount and when files change
  useEffect(() => {
    const initializeIndex = async () => {
      setIsSearching(true);
      try {
        // Try to load cached index
        let index = MetadataStore.loadIndex();

        // If cache is empty or outdated, rebuild it
        if (index.length === 0 || index.length !== files.length) {
          index = await buildSearchIndex(files);
          MetadataStore.saveIndex(index);
        }

        setSearchIndex(index);
      } catch (error) {
        console.error('Failed to initialize search index:', error);
      } finally {
        setIsSearching(false);
      }
    };

    if (files.length > 0) {
      initializeIndex();
    }
  }, [files]);

  // Perform search when query or filters change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Apply filters
      const activeFilters: SearchFilters = {
        extension: selectedExtensions.size > 0 ? Array.from(selectedExtensions) : undefined,
        tags: selectedTags.size > 0 ? Array.from(selectedTags) : undefined,
        minSize: minSize > 0 ? minSize : undefined,
        maxSize: maxSize < Number.MAX_SAFE_INTEGER ? maxSize : undefined,
      };

      // Perform search
      let results = searchFiles(searchQuery, searchIndex, 100);

      // Apply additional filters
      results = filterSearchResults(results, activeFilters);

      // Map to include file data
      const resultsWithFiles = results
        .map(result => {
          const file = files.find(f => f.id === (result.file as any).fileId);
          return {
            ...result,
            file: file || (result.file as FileItem),
          };
        })
        .filter(r => r.file);

      setSearchResults(resultsWithFiles);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchIndex, filters, selectedTags, selectedExtensions, minSize, maxSize, files]);

  // Get unique extensions from results
  const availableExtensions = useMemo(() => {
    const exts = new Set<string>();
    searchIndex.forEach(item => {
      const fileExt = item.filename.split('.').pop()?.toLowerCase();
      if (fileExt) exts.add(fileExt);
    });
    return Array.from(exts).sort();
  }, [searchIndex]);

  // Get unique tags from results
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    searchIndex.forEach(item => {
      item.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [searchIndex]);

  // Handle file selection
  const handleSelectFile = (file: FileItem) => {
    onSelectFile?.(file);
  };

  // Toggle tag filter
  const toggleTag = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setSelectedTags(newTags);
  };

  // Toggle extension filter
  const toggleExtension = (ext: string) => {
    const newExts = new Set(selectedExtensions);
    if (newExts.has(ext)) {
      newExts.delete(ext);
    } else {
      newExts.add(ext);
    }
    setSelectedExtensions(newExts);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedTags(new Set());
    setSelectedExtensions(new Set());
    setMinSize(0);
    setMaxSize(Number.MAX_SAFE_INTEGER);
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-lg border border-gray-200">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search files by name, content, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search/Filter toggle buttons */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg border transition-colors ${
            showFilters
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          title="Toggle advanced filters"
        >
          ⚙️ Filters
        </button>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* File type filter */}
          {availableExtensions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Type
              </label>
              <div className="flex flex-wrap gap-2">
                {availableExtensions.slice(0, 8).map(ext => (
                  <button
                    key={ext}
                    onClick={() => toggleExtension(ext)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedExtensions.has(ext)
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    .{ext}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tag filter */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {availableTags.slice(0, 6).map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedTags.has(tag)
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size range filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Size (KB)
            </label>
            <input
              type="number"
              min="0"
              value={minSize / 1024}
              onChange={(e) => setMinSize(Number(e.target.value) * 1024)}
              className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Max size filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Size (KB)
            </label>
            <input
              type="number"
              min="0"
              value={maxSize === Number.MAX_SAFE_INTEGER ? '' : maxSize / 1024}
              onChange={(e) => setMaxSize(e.target.value ? Number(e.target.value) * 1024 : Number.MAX_SAFE_INTEGER)}
              className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Clear filters button */}
          {(selectedTags.size > 0 || selectedExtensions.size > 0 || minSize > 0 || maxSize < Number.MAX_SAFE_INTEGER) && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-3 py-1 text-sm bg-red-50 text-red-700 border border-red-300 rounded hover:bg-red-100 transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search info */}
      {searchQuery && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            Found <strong>{searchResults.length}</strong> result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
          </span>
          {isSearching && <span className="text-blue-600">Searching...</span>}
        </div>
      )}

      {/* Results list */}
      <div
        className="overflow-y-auto bg-white rounded border border-gray-200"
        style={{ maxHeight: `${containerHeight}px` }}
      >
        {searchResults.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            {searchQuery ? (
              <div className="text-center">
                <p>No results found</p>
                <p className="text-xs mt-1">Try different keywords or adjust filters</p>
              </div>
            ) : (
              <p>Enter a search query to begin</p>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {searchResults.map((result, idx) => (
              <div
                key={`${result.file.id}-${idx}`}
                onClick={() => handleSelectFile(result.file)}
                className="p-3 hover:bg-blue-50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-blue-500"
              >
                {/* File header */}
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex-shrink-0 text-2xl">
                    {getFileIcon(result.file.extension)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {result.file.name}
                    </div>
                    <div className="text-xs text-gray-500 space-x-2">
                      <span>{formatBytes(result.file.size)}</span>
                      <span>•</span>
                      <span>{new Date(result.file.modifiedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {/* Relevance score */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-medium text-blue-600">
                      {result.relevance}%
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {result.matchedIn}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {result.metadata.tags && result.metadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {result.metadata.tags.slice(0, 4).map(tag => (
                      <span
                        key={tag.id}
                        className="inline-block px-2 py-0.5 text-xs rounded-full"
                        style={{
                          backgroundColor: tag.color ? `${tag.color}20` : '#E5E7EB',
                          color: tag.color || '#6B7280',
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                    {result.metadata.tags.length > 4 && (
                      <span className="text-xs text-gray-500 self-center">
                        +{result.metadata.tags.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Content snippet */}
                {result.snippet && (
                  <div className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded border-l-2 border-yellow-400 line-clamp-2">
                    <strong>Match:</strong> {result.snippet}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty state when no files */}
      {files.length === 0 && (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <div className="text-center">
            <p className="text-lg font-medium mb-1">No files to search</p>
            <p className="text-sm">Load files first to enable search functionality</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Get file icon emoji based on extension
 */
function getFileIcon(extension: string): string {
  const ext = extension.toLowerCase();
  const iconMap: Record<string, string> = {
    'pdf': '📄',
    'doc': '📝', 'docx': '📝',
    'xls': '📊', 'xlsx': '📊',
    'ppt': '🎬', 'pptx': '🎬',
    'txt': '📋',
    'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
    'mp4': '🎥', 'avi': '🎥', 'mkv': '🎥',
    'mp3': '🎵', 'wav': '🎵', 'flac': '🎵',
    'zip': '📦', 'rar': '📦', '7z': '📦',
    'json': '💻', 'js': '💻', 'ts': '💻', 'py': '💻',
  };
  return iconMap[ext] || '📋';
}
