import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileItem } from '../AppTypes';
import { calculateVirtualState, getVisibleItems, calculateSpacers } from '../lib/virtualScroll';
import { formatBytes } from '../lib/formatBytes';

interface VirtualizedFileListProps {
  files: FileItem[];
  itemHeight?: number;
  onSelectFile?: (file: FileItem) => void;
  onSelectMultiple?: (files: FileItem[]) => void;
  isLoading?: boolean;
  mode?: 'list' | 'grid';
  containerHeight?: number;
  bufferSize?: number;
  selectedFiles?: Set<string>;
}

/**
 * High-performance virtualized file list for 10k+ files
 * Only renders visible items + buffer zone to maintain 60fps
 */
export const VirtualizedFileList: React.FC<VirtualizedFileListProps> = ({
  files,
  itemHeight = 48,
  onSelectFile,
  onSelectMultiple,
  isLoading = false,
  mode = 'list',
  containerHeight = 600,
  bufferSize = 5,
  selectedFiles = new Set(),
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<number | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  // Calculate visible state
  const virtualState = calculateVirtualState(scrollOffset, {
    itemHeight,
    containerHeight,
    bufferSize,
  }, files.length);

  const visibleFiles = getVisibleItems(files, virtualState);
  const spacers = calculateSpacers(virtualState, itemHeight);

  // Handle scroll events with throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const offset = target.scrollTop;
    setScrollOffset(offset);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeout.current !== null) {
      window.clearTimeout(scrollTimeout.current);
    }

    // Reset scrolling state after user stops scrolling
    scrollTimeout.current = window.setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeout.current !== null) {
        window.clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  // Handle file selection
  const handleFileClick = (file: FileItem, event: React.MouseEvent) => {
    event.stopPropagation();
    onSelectFile?.(file);
  };

  // Calculate grid columns for grid mode
  const getGridStyle = () => {
    if (mode === 'grid') {
      const colWidth = 150; // Approximate grid cell width
      const cols = Math.max(1, Math.floor(containerHeight / colWidth));
      return {
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(120px, 1fr))`,
        gap: '8px',
      };
    }
    return {};
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="overflow-auto bg-white rounded-lg border border-gray-200"
      style={{
        height: `${containerHeight}px`,
        position: 'relative',
      }}
    >
      {files.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span>Loading files...</span>
            </div>
          ) : (
            'No files found'
          )}
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            height: `${virtualState.totalHeight}px`,
          }}
        >
          {/* Top spacer */}
          {spacers.top > 0 && (
            <div
              style={{
                height: `${spacers.top}px`,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Visible items container */}
          <div
            style={{
              position: 'absolute',
              top: `${spacers.top}px`,
              left: 0,
              right: 0,
              ...getGridStyle(),
            }}
          >
            {mode === 'list' ? (
              // List view
              visibleFiles.map((file, idx) => (
                <div
                  key={file.id || `${file.name}-${virtualState.visibleStart + idx}`}
                  onClick={(e) => handleFileClick(file, e)}
                  className={`flex items-center gap-3 px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 ${
                    selectedFiles.has(file.id || file.name) ? 'bg-blue-100' : ''
                  }`}
                  style={{
                    height: `${itemHeight}px`,
                  }}
                >
                  {/* File icon */}
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded">
                    <FileIcon extension={file.extension} />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate text-gray-900">
                      {file.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatBytes(file.size)}
                    </div>
                  </div>

                  {/* Modified date */}
                  <div className="flex-shrink-0 text-xs text-gray-500">
                    {file.modifiedAt ? new Date(file.modifiedAt).toLocaleDateString() : '—'}
                  </div>

                  {/* Selection indicator */}
                  {selectedFiles.has(file.id || file.name) && (
                    <div className="flex-shrink-0 w-5 h-5 bg-blue-500 rounded border-2 border-blue-600 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Grid view
              visibleFiles.map((file, idx) => (
                <div
                  key={file.id || `${file.name}-${virtualState.visibleStart + idx}`}
                  onClick={(e) => handleFileClick(file, e)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 hover:border-blue-400 cursor-pointer transition-all ${
                    selectedFiles.has(file.id || file.name)
                      ? 'bg-blue-100 border-blue-500'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded">
                    <FileIcon extension={file.extension} />
                  </div>
                  <div className="text-xs font-medium text-gray-900 text-center truncate w-full">
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatBytes(file.size)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom spacer */}
          {spacers.bottom > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${spacers.bottom}px`,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      )}

      {/* Scrollbar indicator */}
      {isScrolling && (
        <div className="fixed right-0 top-0 w-1 h-full bg-blue-300 opacity-50 pointer-events-none" />
      )}

      {/* Performance stats (dev only) */}
      {files.length > 0 && (
        <div className="fixed bottom-2 right-2 text-xs bg-gray-800 text-white px-2 py-1 rounded opacity-70">
          Rendering: {visibleFiles.length}/{files.length} items
        </div>
      )}
    </div>
  );
};

/**
 * Simple file icon based on file extension
 */
const FileIcon: React.FC<{ extension?: string }> = ({ extension = '' }) => {
  const ext = extension.toLowerCase();
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return <span className="text-lg">🖼️</span>;
  }
  // Video files
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
    return <span className="text-lg">🎬</span>;
  }
  // Audio files
  if (['mp3', 'wav', 'flac', 'aac', 'm4a', 'wma', 'ogg'].includes(ext)) {
    return <span className="text-lg">🎵</span>;
  }
  // PDF
  if (ext === 'pdf') {
    return <span className="text-lg">📄</span>;
  }
  // Word documents
  if (['doc', 'docx', 'odt'].includes(ext)) {
    return <span className="text-lg">📝</span>;
  }
  // Spreadsheets
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return <span className="text-lg">📊</span>;
  }
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return <span className="text-lg">📦</span>;
  }
  // Code files
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash', 'go', 'rs'].includes(ext)) {
    return <span className="text-lg">💻</span>;
  }
  // Default
  return <span className="text-lg">📋</span>;
};
