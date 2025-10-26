import { useState, useEffect, useCallback } from 'react';
import type { FileItem, Folder } from '../AppTypes';
import { getFileTypeIcon } from '../lib/fileCategories';
import { generateThumbnail } from '../lib/thumbnails';
import type { ViewMode } from '../lib/viewPreferences';
import { getGridItemSize, getGalleryItemSize } from '../lib/viewPreferences';

type Props = {
  folder: Folder;
  files: FileItem[]; // Pre-sorted/filtered files
  viewMode: ViewMode;
  gridSize: number;
  selectedFiles: Set<string>;
  highlightedFile?: string;
  showFolders?: boolean; // Hide folders when filtering by category
  onSelectFile: (fileId: string, multi: boolean, range: boolean) => void;
  onFileClick: (file: FileItem) => void;
  onFolderOpen: (folderId: string) => void;
  onDragStart: (fileIds: string[]) => void;
  onDragEnd: () => void;
};

export default function FileGrid({
  folder,
  files,
  viewMode,
  gridSize,
  selectedFiles,
  highlightedFile,
  showFolders = true,
  onSelectFile,
  onFileClick,
  onFolderOpen,
  onDragStart,
  onDragEnd,
}: Props) {
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number>(-1);

  // Load thumbnails for visible files
  useEffect(() => {
    const loadThumbs = async () => {
      for (const file of files.slice(0, 50)) { // Load first 50
        if (thumbnails.has(file.id)) continue;
        const thumb = await generateThumbnail(file);
        if (thumb) {
          setThumbnails((prev) => new Map(prev).set(file.id, thumb));
        }
      }
    };
    loadThumbs();
  }, [files]);

  const handleClick = useCallback(
    (file: FileItem, idx: number, e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Multi-select
        onSelectFile(file.id, true, false);
        setLastSelectedIdx(idx);
      } else if (e.shiftKey && lastSelectedIdx >= 0) {
        // Range select
        onSelectFile(file.id, false, true);
        const start = Math.min(lastSelectedIdx, idx);
        const end = Math.max(lastSelectedIdx, idx);
        for (let i = start; i <= end; i++) {
          onSelectFile(files[i].id, true, false);
        }
      } else {
        // Single click - open preview
        onFileClick(file);
        setLastSelectedIdx(idx);
      }
    },
    [lastSelectedIdx, files, onSelectFile, onFileClick]
  );

  const handleCheckboxClick = useCallback(
    (file: FileItem, idx: number, e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectFile(file.id, e.ctrlKey || e.metaKey, e.shiftKey);
      setLastSelectedIdx(idx);
    },
    [onSelectFile]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, file: FileItem) => {
      const filesToDrag = selectedFiles.has(file.id)
        ? Array.from(selectedFiles)
        : [file.id];
      
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', JSON.stringify({ fileIds: filesToDrag }));
      onDragStart(filesToDrag);
    },
    [selectedFiles, onDragStart]
  );

  const handleDragEnd = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  if (viewMode === 'list') {
    return <FileListView 
      folders={showFolders ? folder.folders : []}
      files={files}
      selectedFiles={selectedFiles}
      highlightedFile={highlightedFile}
      thumbnails={thumbnails}
      onCheckboxClick={handleCheckboxClick}
      onClick={handleClick}
      onFolderOpen={onFolderOpen}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    />;
  }

  if (viewMode === 'gallery') {
    return <FileGalleryView 
      folders={showFolders ? folder.folders : []}
      files={files}
      selectedFiles={selectedFiles}
      highlightedFile={highlightedFile}
      thumbnails={thumbnails}
      gridSize={gridSize}
      onCheckboxClick={handleCheckboxClick}
      onClick={handleClick}
      onFolderOpen={onFolderOpen}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    />;
  }

  // Default: Grid view
  return <FileGridView 
    folders={showFolders ? folder.folders : []}
    files={files}
    selectedFiles={selectedFiles}
    highlightedFile={highlightedFile}
    thumbnails={thumbnails}
    gridSize={gridSize}
    onCheckboxClick={handleCheckboxClick}
    onClick={handleClick}
    onFolderOpen={onFolderOpen}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  />;
}

// Grid View Component
function FileGridView({ folders, files, selectedFiles, highlightedFile, thumbnails, gridSize, onCheckboxClick, onClick, onFolderOpen, onDragStart, onDragEnd }: any) {
  const size = getGridItemSize(gridSize);
  
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size.width}px, 1fr))` }}>
      {/* Folders first */}
      {folders.map((folder: Folder) => (
        <div
          key={folder.id}
          onDoubleClick={() => onFolderOpen(folder.id)}
          className="relative rounded-lg border p-3 transition-all cursor-pointer group border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800/80"
          style={{ height: `${size.height}px` }}
        >
          <div className="flex items-center justify-center mb-2" style={{ height: `${size.height - 60}px` }}>
            <div className="text-5xl">📁</div>
          </div>
          <div className="truncate text-sm font-medium" title={folder.name}>{folder.name}</div>
          <div className="text-xs text-slate-400">{folder.files.length + folder.folders.length} items</div>
        </div>
      ))}
      
      {/* Files */}
      {files.map((file: FileItem, idx: number) => {
        const isSelected = selectedFiles.has(file.id);
        const isHighlighted = highlightedFile === file.id;
        const thumb = thumbnails.get(file.id);

        return (
          <div
            key={file.id}
            draggable
            onDragStart={(e) => onDragStart(e, file)}
            onDragEnd={onDragEnd}
            onClick={(e) => onClick(file, idx, e)}
            className={`relative rounded-lg border p-3 transition-all cursor-pointer group ${
              isSelected
                ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                : isHighlighted
                ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
            }`}
            style={{ height: `${size.height}px` }}
          >
            {/* Checkbox */}
            <div
              className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all z-10 ${
                isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600 bg-slate-800/80 opacity-0 group-hover:opacity-100'
              }`}
              onClick={(e) => onCheckboxClick(file, idx, e)}
            >
              {isSelected && <span className="text-white text-xs">✓</span>}
            </div>

            {/* Thumbnail or Icon */}
            <div className="flex items-center justify-center mb-2" style={{ height: `${size.height - 60}px` }}>
              {thumb ? (
                <img src={thumb} alt={file.name} className="max-w-full max-h-full object-contain rounded" />
              ) : (
                <div className="text-5xl">{getFileTypeIcon(file.extension)}</div>
              )}
            </div>

            {/* File Info */}
            <div className="truncate text-sm font-medium" title={file.name}>{file.name}</div>
            <div className="text-xs text-slate-400">{formatSize(file.size)}</div>
          </div>
        );
      })}
    </div>
  );
}

// Gallery View Component (larger tiles, image-focused)
function FileGalleryView({ folders, files, selectedFiles, highlightedFile, thumbnails, gridSize, onCheckboxClick, onClick, onFolderOpen, onDragStart, onDragEnd }: any) {
  const size = getGalleryItemSize(gridSize);
  
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${size.width}px, 1fr))` }}>
      {/* Folders first */}
      {folders.map((folder: Folder) => (
        <div
          key={folder.id}
          onDoubleClick={() => onFolderOpen(folder.id)}
          className="relative rounded-lg overflow-hidden transition-all cursor-pointer group hover:ring-2 hover:ring-slate-700 bg-slate-900/60"
          style={{ height: `${size.height}px` }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-7xl">📁</div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <div className="truncate text-sm font-medium text-white" title={folder.name}>{folder.name}</div>
            <div className="text-xs text-slate-300">{folder.files.length + folder.folders.length} items</div>
          </div>
        </div>
      ))}
      
      {/* Files */}
      {files.map((file: FileItem, idx: number) => {
        const isSelected = selectedFiles.has(file.id);
        const isHighlighted = highlightedFile === file.id;
        const thumb = thumbnails.get(file.id);

        return (
          <div
            key={file.id}
            draggable
            onDragStart={(e) => onDragStart(e, file)}
            onDragEnd={onDragEnd}
            onClick={(e) => onClick(file, idx, e)}
            className={`relative rounded-lg overflow-hidden transition-all cursor-pointer group ${
              isSelected
                ? 'ring-4 ring-blue-500'
                : isHighlighted
                ? 'ring-4 ring-amber-500'
                : 'hover:ring-2 hover:ring-slate-700'
            }`}
            style={{ height: `${size.height}px` }}
          >
            {/* Checkbox */}
            <div
              className={`absolute top-3 left-3 w-6 h-6 rounded border-2 flex items-center justify-center transition-all z-10 shadow-lg ${
                isSelected ? 'bg-blue-500 border-blue-500' : 'border-white bg-black/50 opacity-0 group-hover:opacity-100'
              }`}
              onClick={(e) => onCheckboxClick(file, idx, e)}
            >
              {isSelected && <span className="text-white text-sm">✓</span>}
            </div>

            {/* Thumbnail */}
            {thumb ? (
              <img src={thumb} alt={file.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900/60">
                <div className="text-7xl">{getFileTypeIcon(file.extension)}</div>
              </div>
            )}

            {/* Overlay with file name */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="truncate text-sm font-medium text-white" title={file.name}>{file.name}</div>
              <div className="text-xs text-slate-300">{formatSize(file.size)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// List View Component (compact, information-dense)
function FileListView({ folders, files, selectedFiles, highlightedFile, thumbnails, onCheckboxClick, onClick, onFolderOpen, onDragStart, onDragEnd }: any) {
  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-900/60 sticky top-0 border-b border-slate-800">
          <tr className="text-left">
            <th className="px-3 py-2 w-10"></th>
            <th className="px-3 py-2 w-12"></th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2 w-24">Size</th>
            <th className="px-3 py-2 w-32">Modified</th>
            <th className="px-3 py-2 w-20">Type</th>
          </tr>
        </thead>
        <tbody>
          {/* Folders first */}
          {folders.map((folder: Folder) => (
            <tr
              key={folder.id}
              onDoubleClick={() => onFolderOpen(folder.id)}
              className="border-t border-slate-800/50 transition-colors cursor-pointer hover:bg-slate-800/30"
            >
              <td className="px-3 py-2"></td>
              <td className="px-3 py-2">
                <span className="text-2xl">📁</span>
              </td>
              <td className="px-3 py-2 font-medium">{folder.name}</td>
              <td className="px-3 py-2 text-slate-400">—</td>
              <td className="px-3 py-2 text-slate-400">—</td>
              <td className="px-3 py-2 text-slate-400">Folder</td>
            </tr>
          ))}
          
          {/* Files */}
          {files.map((file: FileItem, idx: number) => {
            const isSelected = selectedFiles.has(file.id);
            const isHighlighted = highlightedFile === file.id;
            const thumb = thumbnails.get(file.id);

            return (
              <tr
                key={file.id}
                draggable
                onDragStart={(e) => onDragStart(e, file)}
                onDragEnd={onDragEnd}
                onClick={(e) => onClick(file, idx, e)}
                className={`border-t border-slate-800/50 transition-colors cursor-pointer group ${
                  isSelected
                    ? 'bg-blue-500/10'
                    : isHighlighted
                    ? 'bg-amber-500/10'
                    : 'hover:bg-slate-800/30'
                }`}
              >
                <td className="px-3 py-2">
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600 opacity-0 group-hover:opacity-100'
                    }`}
                    onClick={(e) => onCheckboxClick(file, idx, e)}
                  >
                    {isSelected && <span className="text-white text-[10px]">✓</span>}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {thumb ? (
                    <img src={thumb} alt="" className="w-8 h-8 object-cover rounded" />
                  ) : (
                    <span className="text-2xl">{getFileTypeIcon(file.extension)}</span>
                  )}
                </td>
                <td className="px-3 py-2 font-medium">{file.name}</td>
                <td className="px-3 py-2 text-slate-400">{formatSize(file.size)}</td>
                <td className="px-3 py-2 text-slate-400">{formatDate(file.modifiedAt)}</td>
                <td className="px-3 py-2 text-slate-400">{file.extension}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}
