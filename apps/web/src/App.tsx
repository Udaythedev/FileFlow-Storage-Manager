import { useMemo, useState } from 'react';
import SidebarFolders from './components/SidebarFolders';
import FileGrid from './components/FileGrid';
import StorageTreemap from './components/StorageTreemap';
import type { FileItem, Folder } from './AppTypes';

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const initialData: Folder = {
  id: 'root',
  name: 'Root',
  folders: [
    {
      id: 'docs',
      name: 'Documents',
      folders: [],
      files: [
        { id: 'f1', name: 'Project-Plan.pdf', size: 1_250_000, extension: '.pdf', modifiedAt: new Date().toISOString() },
        { id: 'f2', name: 'Resume.docx', size: 220_000, extension: '.docx', modifiedAt: new Date().toISOString() }
      ]
    },
    {
      id: 'media',
      name: 'Media',
      folders: [
        { id: 'photos', name: 'Photos', folders: [], files: [
          { id: 'img1', name: 'IMG_0001.jpg', size: 3_200_000, extension: '.jpg', modifiedAt: new Date().toISOString() },
          { id: 'img2', name: 'IMG_0002.jpg', size: 2_800_000, extension: '.jpg', modifiedAt: new Date().toISOString() }
        ] } as Folder
      ],
      files: [
        { id: 'video1', name: 'Vacation.mp4', size: 120_000_000, extension: '.mp4', modifiedAt: new Date().toISOString() }
      ]
    }
  ],
  files: [
    { id: 'readme', name: 'Readme.txt', size: 3_000, extension: '.txt', modifiedAt: new Date().toISOString() }
  ]
};

function findFolderById(folder: Folder, id: string): Folder | null {
  if (folder.id === id) return folder;
  for (const f of folder.folders) {
    const found = findFolderById(f, id);
    if (found) return found;
  }
  return null;
}

function removeFileFromFolder(folder: Folder, fileId: string): { file: FileItem | null; updated: Folder } {
  // Check this folder's files first
  const idx = folder.files.findIndex(f => f.id === fileId);
  if (idx >= 0) {
    const newFiles = [...folder.files];
    const [file] = newFiles.splice(idx, 1);
    return { file, updated: { ...folder, files: newFiles } };
  }

  // Otherwise traverse child folders
  for (let i = 0; i < folder.folders.length; i++) {
    const child = folder.folders[i];
    const res = removeFileFromFolder(child, fileId);
    if (res.file) {
      const newFolders = [...folder.folders];
      newFolders[i] = res.updated;
      return { file: res.file, updated: { ...folder, folders: newFolders } };
    }
  }

  return { file: null, updated: folder };
}

function insertFileIntoFolder(folder: Folder, targetFolderId: string, file: FileItem): Folder {
  if (folder.id === targetFolderId) {
    return { ...folder, files: [...folder.files, file] };
  }
  return { ...folder, folders: folder.folders.map(f => insertFileIntoFolder(f, targetFolderId, file)) };
}

function computeFolderSizes(folder: Folder): { name: string; size: number; children?: any[] } {
  const fileSize = folder.files.reduce((acc, f) => acc + f.size, 0);
  const children = folder.folders.map(computeFolderSizes);
  const childrenSize = children.reduce((acc, c) => acc + c.size, 0);
  return {
    name: folder.name,
    size: fileSize + childrenSize,
    children: children.length ? children : undefined
  };
}

export default function App() {
  const [root, setRoot] = useState<Folder>(initialData);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');

  const currentFolder = useMemo(() => {
    const found = findFolderById(root, currentFolderId);
    return found ?? root;
  }, [root, currentFolderId]);

  function onMoveFile(fileId: string, targetFolderId: string) {
    try {
      const { file, updated } = removeFileFromFolder(root, fileId);
      if (!file) return;
      const next = insertFileIntoFolder(updated, targetFolderId, file);
      setRoot(next);
    } catch (err) {
      console.error('Error moving file:', err);
    }
  }

  const treemapData = useMemo(() => {
    try {
      return computeFolderSizes(root);
    } catch (err) {
      console.error('Error computing treemap:', err);
      return { name: 'Root', size: 0, children: [] };
    }
  }, [root]);

  try {
    return (
      <div className="h-screen w-screen grid grid-cols-[280px_1fr] grid-rows-[auto_1fr]">
        <header className="col-span-2 px-4 py-3 border-b border-slate-800 bg-slate-900/70 backdrop-blur glass-panel">
          <h1 className="text-lg font-semibold tracking-wide">Symentha • Storage Manager</h1>
        </header>

        <aside className="border-r border-slate-800 overflow-auto p-3">
          <SidebarFolders
            root={root}
            currentFolderId={currentFolderId}
            onSelectFolder={setCurrentFolderId}
            onDropFile={(fileId, folderId) => onMoveFile(fileId, folderId)}
          />
        </aside>

        <main className="overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-800">
            <h2 className="font-medium">{currentFolder.name}</h2>
            <p className="text-xs text-slate-400">{currentFolder.files.length} files • {bytes(computeFolderSizes(currentFolder).size)}</p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-0 min-h-0">
            <div className="p-3 overflow-auto">
              <FileGrid folder={currentFolder} onDragFileStart={() => {}} onDragFileEnd={() => {}} />
            </div>
            <div className="p-3 border-l border-slate-800 overflow-auto">
              <StorageTreemap data={treemapData} />
            </div>
          </div>
        </main>
      </div>
    );
  } catch (err) {
    console.error('Render error:', err);
    return (
      <div className="h-screen w-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-2">App Error</h1>
          <p className="text-slate-400">Check browser console for details</p>
        </div>
      </div>
    );
  }
}
