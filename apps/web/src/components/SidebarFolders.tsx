import type { Folder } from '../AppTypes';
import { useMemo } from 'react';

type Props = {
  root: Folder;
  currentFolderId: string;
  onSelectFolder: (id: string) => void;
  onDropFile: (fileId: string, folderId: string) => void;
};

function FolderNode({ folder, depth, currentId, onSelect, onDropFile }: {
  folder: Folder;
  depth: number;
  currentId: string;
  onSelect: (id: string) => void;
  onDropFile: (fileId: string, folderId: string) => void;
}) {
  const padding = useMemo(() => ({ paddingLeft: `${depth * 12}px` }), [depth]);
  const isActive = currentId === folder.id;

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
      const data = JSON.parse(payload) as { fileId: string };
      if (data.fileId) onDropFile(data.fileId, folder.id);
    } catch {}
  }

  return (
    <div
      className={`rounded px-2 py-1 cursor-pointer hover:bg-slate-800/60 ${isActive ? 'bg-slate-800' : ''}`}
      style={padding}
      onClick={() => onSelect(folder.id)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span className="mr-2">📁</span>
      <span>{folder.name}</span>
    </div>
  );
}

export default function SidebarFolders({ root, currentFolderId, onSelectFolder, onDropFile }: Props) {
  function renderTree(folder: Folder, depth = 0): JSX.Element[] {
    const nodes: JSX.Element[] = [];
    nodes.push(
      <div key={folder.id}>
        <FolderNode
          folder={folder}
          depth={depth}
          currentId={currentFolderId}
          onSelect={onSelectFolder}
          onDropFile={onDropFile}
        />
      </div>
    );
    for (const child of folder.folders) {
      nodes.push(...renderTree(child, depth + 1));
    }
    return nodes;
  }

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-400 px-2 mb-2">Folders</div>
      <div className="space-y-1">
        {renderTree(root, 0)}
      </div>
    </div>
  );
}
