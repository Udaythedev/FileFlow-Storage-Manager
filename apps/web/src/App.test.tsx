import { useMemo, useState } from 'react';
import SidebarFolders from './components/SidebarFolders';
import FileGrid from './components/FileGrid';
import StorageTreemap from './components/StorageTreemap';
import type { FileItem, Folder } from './AppTypes';

// Minimal test - just render a heading
export default function App() {
  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Symentha • Storage Manager</h1>
        <p className="text-slate-400">Testing basic render...</p>
      </div>
    </div>
  );
}
