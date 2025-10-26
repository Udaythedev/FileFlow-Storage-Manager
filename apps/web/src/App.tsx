import { useEffect, useMemo, useState, useRef } from 'react';
import SidebarFolders from './components/SidebarFolders';
import FileGrid from './components/FileGrid';
import StorageTreemap from './components/StorageTreemap';
import type { FileItem, Folder } from './AppTypes';
import JunkCleaner from './components/JunkCleaner';
import { scanForJunkFiles, type JunkFinding } from './lib/junk';
import DuplicateFinder, { type DuplicateGroup } from './components/DuplicateFinder';
import { findDuplicates as groupDuplicates } from './lib/duplicates';
import { loadViewPreferences, saveViewPreferences, type ViewMode, type SortBy, type SortOrder } from './lib/viewPreferences';
import { sortFiles } from './lib/sorting';
import { getFileCategory, type FileCategory } from './lib/fileCategories';
import PreviewModal from './components/PreviewModal';
import Breadcrumbs from './components/Breadcrumbs';
import DeleteConfirmation from './components/DeleteConfirmation';
import CategoryFilters from './components/CategoryFilters';

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

function findParentWithFile(folder: Folder, fileId: string): Folder | null {
  if (folder.files.some(f => f.id === fileId)) return folder;
  for (const child of folder.folders) {
    const res = findParentWithFile(child, fileId);
    if (res) return res;
  }
  return null;
}

function findFileById(folder: Folder, fileId: string): FileItem | null {
  for (const f of folder.files) if (f.id === fileId) return f;
  for (const child of folder.folders) {
    const res = findFileById(child, fileId);
    if (res) return res;
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
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showJunk, setShowJunk] = useState(false);
  const [junkFindings, setJunkFindings] = useState<JunkFinding[]>([]);
  const [selectedJunk, setSelectedJunk] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDupes, setShowDupes] = useState(false);
  const [dupeGroups, setDupeGroups] = useState<DuplicateGroup[]>([]);
  const [deletingGroupIdx, setDeletingGroupIdx] = useState<number | null>(null);

    // View preferences
    const [viewPrefs, setViewPrefs] = useState(() => loadViewPreferences());
    const [categoryFilter, setCategoryFilter] = useState<FileCategory | null>(null); // Top filter (local)
    const [quickFilter, setQuickFilter] = useState<FileCategory | null>(null); // Sidebar quick filter (recursive)
    const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [highlightedFile, setHighlightedFile] = useState<string | undefined>();
  const [highlightedFolderId, setHighlightedFolderId] = useState<string | undefined>();
  
  // Preview modal state
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filesToDelete, setFilesToDelete] = useState<FileItem[]>([]);

  const currentFolder = useMemo(() => {
    const found = findFolderById(root, currentFolderId);
    return found ?? root;
  }, [root, currentFolderId]);

  // Build breadcrumb path from root to current folder
  const breadcrumbPath = useMemo(() => {
    const path: Array<{ id: string; name: string }> = [];
    function buildPath(folder: Folder, targetId: string): boolean {
      path.push({ id: folder.id, name: folder.name });
      if (folder.id === targetId) return true;
      for (const child of folder.folders) {
        if (buildPath(child, targetId)) return true;
      }
      path.pop();
      return false;
    }
    buildPath(root, currentFolderId);
    return path;
  }, [root, currentFolderId]);    // Get files to display based on filters
    const displayFiles = useMemo(() => {
      let files: FileItem[];

      // Determine base file set
      if (quickFilter !== null) {
        // Quick Access: Get all files from current folder + subfolders recursively
        files = collectAllFiles(currentFolder);
        // Apply quick access category filter
        files = files.filter(f => getFileCategory(f.extension) === quickFilter);
      } else {
        // No quick access: Just use current folder files
        files = currentFolder.files;
        // Apply top category filter if present
        if (categoryFilter !== null) {
          files = files.filter(f => getFileCategory(f.extension) === categoryFilter);
        }
      }

      // Apply search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        files = files.filter(f => f.name.toLowerCase().includes(query));
      }

      // Apply sorting
      return sortFiles(files, viewPrefs.sortBy, viewPrefs.sortOrder);
    }, [currentFolder, categoryFilter, quickFilter, searchQuery, viewPrefs.sortBy, viewPrefs.sortOrder]);

    // Count files by category from current folder + subfolders (for quick filters)
    const categoryCounts = useMemo(() => {
      const allFiles = collectAllFiles(currentFolder);
      const counts: Record<FileCategory, number> = {
        image: 0,
        video: 0,
        audio: 0,
        document: 0,
        archive: 0,
        code: 0,
        other: 0,
      };
      
      for (const file of allFiles) {
        const category = getFileCategory(file.extension);
        counts[category]++;
      }
      
      return counts;
    }, [currentFolder]);

    // Selection computed values
    const selectedSize = useMemo(() => {
      return Array.from(selectedFiles)
        .map(id => findFileById(root, id))
        .filter(Boolean)
        .reduce((sum, f) => sum + (f?.size ?? 0), 0);
    }, [selectedFiles, root]);

    // View preference handlers
    function setViewMode(mode: ViewMode) {
      setViewPrefs((prev) => {
        const updated = { ...prev, mode };
        saveViewPreferences(updated);
        return updated;
      });
    }

    function setGridSize(size: number) {
      setViewPrefs((prev) => {
        const updated = { ...prev, gridSize: size };
        saveViewPreferences(updated);
        return updated;
      });
    }

    function setSortBy(sortBy: SortBy) {
      setViewPrefs((prev) => {
        const updated = { ...prev, sortBy };
        saveViewPreferences(updated);
        return updated;
      });
    }

    function toggleSortOrder() {
      setViewPrefs((prev) => {
        const updated = { ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' as SortOrder : 'asc' as SortOrder };
        saveViewPreferences(updated);
        return updated;
      });
    }

    // Selection handlers
    function handleSelectFile(fileId: string, multi: boolean, range: boolean) {
      setSelectedFiles((prev) => {
        const next = new Set(prev);
        if (multi) {
          if (next.has(fileId)) next.delete(fileId);
          else next.add(fileId);
        } else if (!range) {
          next.clear();
          next.add(fileId);
        } else {
          // Range handled in FileGrid
          if (!next.has(fileId)) next.add(fileId);
        }
        return next;
      });
    }

    function selectAllFiles() {
      setSelectedFiles(new Set(displayFiles.map(f => f.id)));
    }

    function clearSelection() {
      setSelectedFiles(new Set());
    }

    function handleFileClick(file: FileItem) {
      setPreviewFile(file);
    }

    const previewIndex = useMemo(() => {
      if (!previewFile) return -1;
      return displayFiles.findIndex(f => f.id === previewFile.id);
    }, [previewFile, displayFiles]);

    function closePreview() { setPreviewFile(null); }
    function prevPreview() {
      if (displayFiles.length === 0 || previewIndex < 0) return;
      const idx = (previewIndex - 1 + displayFiles.length) % displayFiles.length;
      setPreviewFile(displayFiles[idx]);
    }
    function nextPreview() {
      if (displayFiles.length === 0 || previewIndex < 0) return;
      const idx = (previewIndex + 1) % displayFiles.length;
      setPreviewFile(displayFiles[idx]);
    }

    function handleDragStart(fileIds: string[]) {
      // Visual feedback during drag
    }

    function handleDragEnd() {
      // Clean up drag state
    }

    function handleDeleteSelected() {
      const files = Array.from(selectedFiles)
        .map(id => findFileById(root, id))
        .filter(Boolean) as FileItem[];
      
      if (files.length === 0) return;
      
      setFilesToDelete(files);
      setShowDeleteConfirm(true);
    }

    async function confirmDelete() {
      setShowDeleteConfirm(false);
      setDeleting(true);
      
      try {
        // Delete on disk when possible
        for (const file of filesToDelete) {
          const parent = findParentWithFile(root, file.id);
          if (parent?.handle && file.handle) {
            try {
              await parent.handle.removeEntry(file.name, { recursive: false });
            } catch (e) {
              console.warn('Delete failed for', file.name, e);
            }
          }
        }
        
        // Update memory tree
        let updatedTree = root;
        for (const file of filesToDelete) {
          const res = removeFileFromFolder(updatedTree, file.id);
          updatedTree = res.updated;
        }
        
        setRoot(updatedTree);
        setSelectedFiles(new Set());
        setFilesToDelete([]);
      } finally {
        setDeleting(false);
      }
    }

    function cancelDelete() {
      setShowDeleteConfirm(false);
      setFilesToDelete([]);
    }

  async function onMoveFile(fileId: string, targetFolderId: string) {
    try {
      const srcParent = findParentWithFile(root, fileId);
      const destFolder = findFolderById(root, targetFolderId);
      const file = findFileById(root, fileId);
      if (!file || !destFolder) return;

      // Perform disk move if handles are available
      if (srcParent?.handle && destFolder.handle && file.handle) {
        try {
          const destFileHandle = await destFolder.handle.getFileHandle(file.name, { create: true });
          const writable = await (destFileHandle as any).createWritable();
          const blob = await (file.handle as any).getFile();
          await writable.write(blob);
          await writable.close();
          await srcParent.handle.removeEntry(file.name, { recursive: false });
        } catch (e: any) {
          console.error('Disk move failed', e);
          setError(e?.message ?? 'Disk move failed');
          return;
        }
      }

      // Update in-memory tree
      file.parentId = targetFolderId;
      const { file: removed, updated } = removeFileFromFolder(root, fileId);
      if (!removed) return;
      const next = insertFileIntoFolder(updated, targetFolderId, removed);
      setRoot(next);
    } catch (err) {
      console.error('Error moving file:', err);
      setError('Error moving file');
    }
  }

  async function onMoveFiles(fileIds: string[], targetFolderId: string) {
    for (const id of fileIds) {
      await onMoveFile(id, targetFolderId);
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

  function collectAllFiles(folder: Folder): FileItem[] {
    const out: FileItem[] = [...folder.files];
    for (const child of folder.folders) out.push(...collectAllFiles(child));
    return out;
  }

  function rescanJunk() {
    const files = collectAllFiles(root);
    const findings = scanForJunkFiles(files);
    setJunkFindings(findings);
    setSelectedJunk(new Set());
  }

  function rescanDuplicates() {
    const files = collectAllFiles(root);
    const groups = groupDuplicates(files);
    setDupeGroups(groups);
    setDeletingGroupIdx(null);
  }

  useEffect(() => {
    const chooseBtn = document.getElementById('choose-folder-btn');
    const resetBtn = document.getElementById('reset-mock-btn');
    async function onChoose() {
      setError(null);
      setScanning(true);
      try {
        const { pickAndScanDirectory } = await import('./lib/fsAccess');
        const scanned = await pickAndScanDirectory({});
        setRoot(scanned);
        setCurrentFolderId(scanned.id);
  if (showJunk) rescanJunk();
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? 'Failed to scan folder');
      } finally {
        setScanning(false);
      }
    }
    function onReset() {
      setError(null);
      setRoot(initialData);
      setCurrentFolderId('root');
      if (showJunk) rescanJunk();
      if (showDupes) rescanDuplicates();
    }
    function onToggleJunk() {
      setShowJunk((prev) => {
        const next = !prev;
        if (next) {
          rescanJunk();
          setShowDupes(false);
        }
        return next;
      });
    }
    function onToggleDupes() {
      setShowDupes((prev) => {
        const next = !prev;
        if (next) {
          rescanDuplicates();
          setShowJunk(false);
        }
        return next;
      });
    }
    chooseBtn?.addEventListener('click', onChoose);
    resetBtn?.addEventListener('click', onReset);
    const junkBtn = document.getElementById('junk-btn');
    junkBtn?.addEventListener('click', onToggleJunk);
    const dupeBtn = document.getElementById('dupe-btn');
    dupeBtn?.addEventListener('click', onToggleDupes);
    return () => {
      chooseBtn?.removeEventListener('click', onChoose);
      resetBtn?.removeEventListener('click', onReset);
      junkBtn?.removeEventListener('click', onToggleJunk);
      dupeBtn?.removeEventListener('click', onToggleDupes);
    };
  }, [showJunk, showDupes, root]);

  function toggleSelect(fileId: string) {
    setSelectedJunk((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId); else next.add(fileId);
      return next;
    });
  }
  function toggleAll(checked: boolean) {
    if (!checked) { setSelectedJunk(new Set()); return; }
    setSelectedJunk(new Set(junkFindings.map(f => f.item.id)));
  }

  async function deleteSelectedJunk() {
    if (selectedJunk.size === 0) return;
    setDeleting(true);
    try {
      // Delete on disk when possible
      for (const id of Array.from(selectedJunk)) {
        const parent = findParentWithFile(root, id);
        const file = findFileById(root, id);
        if (parent?.handle && file?.handle) {
          try {
            await parent.handle.removeEntry(file.name, { recursive: false });
          } catch (e) {
            console.warn('Delete failed for', file?.name, e);
          }
        }
      }
      // Update memory tree
      let updatedTree = root;
      for (const id of Array.from(selectedJunk)) {
        const res = removeFileFromFolder(updatedTree, id);
        updatedTree = res.updated;
      }
      setRoot(updatedTree);
      rescanJunk();
    } finally {
      setDeleting(false);
    }
  }

  async function deleteDupeGroup(idx: number) {
    const group = dupeGroups[idx];
    if (!group || group.length < 2) return;
    setDeletingGroupIdx(idx);
    try {
      const sorted = [...group].sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
      const keep = sorted[0];
      const toDelete = sorted.slice(1);

      // Try on-disk deletion when handles present
      for (const f of toDelete) {
        const parent = findParentWithFile(root, f.id);
        if (parent?.handle && f.handle) {
          try {
            await parent.handle.removeEntry(f.name, { recursive: false });
          } catch (e) {
            console.warn('Delete failed for', f?.name, e);
          }
        }
      }
      // Update memory
      let updatedTree = root;
      for (const f of toDelete) {
        const res = removeFileFromFolder(updatedTree, f.id);
        updatedTree = res.updated;
      }
      setRoot(updatedTree);
      rescanDuplicates();
    } finally {
      setDeletingGroupIdx(null);
    }
  }

  try {
    return (
      <div className="h-screen w-screen grid grid-cols-[280px_1fr] grid-rows-[auto_1fr]">
        <header className="col-span-2 px-4 py-3 border-b border-slate-800 bg-slate-900/70 backdrop-blur glass-panel flex items-center justify-between">
    <h1 className="text-lg font-semibold tracking-wide">FileFlow • Storage Manager</h1>
          <div className="flex items-center gap-2">
            <button id="choose-folder-btn" className="px-3 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 border border-slate-700" title="Choose a local folder to analyze">Choose Folder</button>
            <button id="reset-mock-btn" className="px-3 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 border border-slate-700" title="Reset to mock data">Reset</button>
            <button id="junk-btn" className={`px-3 py-1.5 text-sm rounded border ${showJunk ? 'bg-amber-800/50 border-amber-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'}`} title="Toggle Junk Cleaner">Junk Cleaner</button>
            <button id="dupe-btn" className={`px-3 py-1.5 text-sm rounded border ${showDupes ? 'bg-emerald-800/50 border-emerald-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700'}`} title="Toggle Duplicate Finder">Duplicates</button>
          </div>
        </header>

        <aside className="border-r border-slate-800 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-auto p-3">
            <SidebarFolders
              root={root}
              currentFolderId={currentFolderId}
              highlightedFolderId={highlightedFolderId}
              onSelectFolder={setCurrentFolderId}
              onDropFile={(fileIds, folderId) => onMoveFiles(fileIds, folderId)}
            />
          </div>
          <div className="flex-shrink-0">
            <CategoryFilters 
              categoryFilter={quickFilter}
              setCategoryFilter={setQuickFilter}
              categoryCounts={categoryCounts}
            />
          </div>
        </aside>

        <main className="overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Breadcrumbs path={breadcrumbPath} onNavigate={setCurrentFolderId} />
                  <p className="text-xs text-slate-400 mt-1">
                    {displayFiles.length} files
                    {selectedFiles.size > 0 && ` • ${selectedFiles.size} selected (${bytes(selectedSize)})`}
                  </p>
                </div>
              
              {/* Selection toolbar */}
              {selectedFiles.size > 0 && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleDeleteSelected}
                    disabled={deleting}
                    className="px-3 py-1.5 text-sm rounded bg-red-700/70 hover:bg-red-700 disabled:opacity-50 border border-red-800"
                  >
                    {deleting ? 'Deleting...' : `Delete (${selectedFiles.size})`}
                  </button>
                  <button onClick={clearSelection} className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-700">
                    Clear
                  </button>
                </div>
              )}
            </div>              {/* View Controls */}
              <div className="flex items-center gap-4 text-sm">
                {/* Category Filter (Local - current folder only) */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Filter:</span>
                  <select 
                    value={categoryFilter ?? 'all'}
                    onChange={(e) => setCategoryFilter(e.target.value === 'all' ? null : e.target.value as FileCategory)}
                    className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700"
                    title="Filter files in current folder only"
                  >
                    <option value="all">All Types</option>
                    <option value="image">Photos</option>
                    <option value="video">Videos</option>
                    <option value="document">Documents</option>
                    <option value="audio">Audio</option>
                    <option value="archive">Archives</option>
                    <option value="code">Code</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* View Mode */}
                <div className="flex items-center gap-1 border border-slate-800 rounded overflow-hidden">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`px-2 py-1 ${viewPrefs.mode === 'grid' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
                    title="Grid View"
                  >
                    ⊞
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`px-2 py-1 ${viewPrefs.mode === 'list' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
                    title="List View"
                  >
                    ≡
                  </button>
                  <button 
                    onClick={() => setViewMode('gallery')}
                    className={`px-2 py-1 ${viewPrefs.mode === 'gallery' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
                    title="Gallery View"
                  >
                    ▦
                  </button>
                </div>

                {/* Size Slider (for grid/gallery) */}
                {viewPrefs.mode !== 'list' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Size:</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      value={viewPrefs.gridSize}
                      onChange={(e) => setGridSize(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                )}

                {/* Sort */}
                <div className="flex items-center gap-1">
                  <select 
                    value={viewPrefs.sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700"
                  >
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                    <option value="date">Date</option>
                    <option value="type">Type</option>
                  </select>
                  <button 
                    onClick={toggleSortOrder}
                    className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-700"
                    title={`Sort ${viewPrefs.sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                  >
                    {viewPrefs.sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>

                {/* Select All */}
                <button 
                  onClick={selectAllFiles}
                  className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-700"
                >
                  Select All
                </button>

                {/* Search */}
                <input 
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs rounded bg-slate-800 border border-slate-700 placeholder-slate-500"
                />
              </div>

            {scanning && <p className="text-xs text-amber-400 mt-1">Scanning folder…</p>}
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-0 min-h-0">
            <div className="p-3 overflow-auto">
                <FileGrid 
                  folder={currentFolder}
                  files={displayFiles}
                  viewMode={viewPrefs.mode}
                  gridSize={viewPrefs.gridSize}
                  selectedFiles={selectedFiles}
                  highlightedFile={highlightedFile}
                  showFolders={quickFilter === null}
                  onSelectFile={handleSelectFile}
                  onFileClick={handleFileClick}
                  onFolderOpen={setCurrentFolderId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
            </div>
            <div className="p-3 border-l border-slate-800 overflow-auto">
              {showJunk ? (
                <JunkCleaner
                  findings={junkFindings}
                  selected={selectedJunk}
                  onToggle={toggleSelect}
                  onToggleAll={toggleAll}
                  onDeleteSelected={deleteSelectedJunk}
                  deleting={deleting}
                  onGoToSource={(fileId) => {
                    const parent = findParentWithFile(root, fileId);
                    if (parent) {
                      setShowJunk(false); // Close tools panel
                      setCurrentFolderId(parent.id);
                      setHighlightedFolderId(parent.id);
                      setHighlightedFile(fileId);
                      setTimeout(() => {
                        setHighlightedFolderId(undefined);
                        setHighlightedFile(undefined);
                      }, 2500);
                    }
                  }}
                  onPreview={(fileId) => {
                    const f = findFileById(root, fileId);
                    if (f) setPreviewFile(f);
                  }}
                />
              ) : showDupes ? (
                <DuplicateFinder
                  groups={dupeGroups}
                  onDeleteGroup={deleteDupeGroup}
                  deletingGroupIdx={deletingGroupIdx}
                  onGoToSource={(fileId) => {
                    const parent = findParentWithFile(root, fileId);
                    if (parent) {
                      setShowDupes(false); // Close tools panel
                      setCurrentFolderId(parent.id);
                      setHighlightedFolderId(parent.id);
                      setHighlightedFile(fileId);
                      setTimeout(() => {
                        setHighlightedFolderId(undefined);
                        setHighlightedFile(undefined);
                      }, 2500);
                    }
                  }}
                  onPreview={(fileId) => {
                    const f = findFileById(root, fileId);
                    if (f) setPreviewFile(f);
                  }}
                />
              ) : (
                <StorageTreemap data={treemapData} />
              )}
            </div>
          </div>
          {previewFile && previewIndex >= 0 && (
            <PreviewModal 
              files={displayFiles}
              index={previewIndex}
              onClose={closePreview}
              onPrev={prevPreview}
              onNext={nextPreview}
            />
          )}
          {showDeleteConfirm && (
            <DeleteConfirmation 
              files={filesToDelete}
              thumbnails={new Map()} // TODO: Pass actual thumbnails from FileGrid
              onConfirm={confirmDelete}
              onCancel={cancelDelete}
            />
          )}
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
