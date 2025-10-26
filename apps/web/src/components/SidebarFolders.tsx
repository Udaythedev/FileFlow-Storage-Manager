import type { Folder } from '../AppTypes';
import { useMemo, useState } from 'react';

type Props = {
  root: Folder;
  currentFolderId: string;
  highlightedFolderId?: string;
  onSelectFolder: (id: string) => void;
  onDropFile: (fileIds: string[], folderId: string) => void;
};

function FolderNode({ folder, depth, currentId, highlightedId, onSelect, onDropFile }: {
  folder: Folder;
  depth: number;
  currentId: string;
  highlightedId?: string;
  onSelect: (id: string) => void;
  onDropFile: (fileIds: string[], folderId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true); // Default expanded for now
  const padding = useMemo(() => ({ paddingLeft: `${depth * 12}px` }), [depth]);
  const isActive = currentId === folder.id;
  const isHighlighted = highlightedId === folder.id;
  const hasChildren = folder.folders.length > 0;

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.currentTarget.classList.add('drop-target');
  }
  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.currentTarget.classList.remove('drop-target');
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).classList.remove('drop-target');
    const payload = e.dataTransfer.getData('application/json');
    if (!payload) return;
    try {
      const data = JSON.parse(payload) as { fileId?: string; fileIds?: string[] };
      if (Array.isArray(data.fileIds) && data.fileIds.length) {
        onDropFile(data.fileIds, folder.id);
      } else if (data.fileId) {
        onDropFile([data.fileId], folder.id);
      }
    } catch {}
  }

  return (
    <>
      <div
        className={`rounded px-2 py-1 cursor-pointer hover:bg-slate-800/60 transition-colors flex items-center gap-2 ${
          isActive ? 'bg-slate-800' : isHighlighted ? 'bg-amber-500/20 border border-amber-500/50' : ''
        }`}
        style={padding}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-4 h-4 flex items-center justify-center hover:bg-slate-700 rounded text-xs"
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <span className="w-4"></span>}
        <span className="mr-1">{expanded ? '📂' : '📁'}</span>
        <span 
          className="flex-1"
          onClick={() => onSelect(folder.id)}
        >
          {folder.name}
        </span>
        <span className="text-xs text-slate-500">{folder.files.length}</span>
      </div>
      {expanded && folder.folders.map(child => (
        <FolderNode
          key={child.id}
          folder={child}
          depth={depth + 1}
          currentId={currentId}
          highlightedId={highlightedId}
          onSelect={onSelect}
          onDropFile={onDropFile}
        />
      ))}
    </>
  );
}

export default function SidebarFolders({ root, currentFolderId, highlightedFolderId, onSelectFolder, onDropFile }: Props) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-400 px-2 mb-2">Folders</div>
      <div className="space-y-0.5">
        <FolderNode
          folder={root}
          depth={0}
          currentId={currentFolderId}
          highlightedId={highlightedFolderId}
          onSelect={onSelectFolder}
          onDropFile={onDropFile}
        />
      </div>
    </div>
  );
}
