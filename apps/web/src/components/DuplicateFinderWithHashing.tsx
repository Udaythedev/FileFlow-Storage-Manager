import React, { useState, useRef } from 'react';
import { findDuplicates } from '../lib/duplicates';
import type { FileItem } from '../AppTypes';
import { pickAndScanDirectory } from '../lib/fsAccess';
import { formatBytes } from '../lib/formatBytes';

interface DuplicateGroup {
  hash: string;
  files: FileItem[];
  totalSize: number;
  saveable: number;
}

/**
 * Enhanced Duplicate Finder with content-based hashing
 * Replaces name+size heuristic with true SHA-256 content comparison
 */
export const DuplicateFinderWithHashing: React.FC = () => {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [scanning, setScanning] = useState(false);
  const [hashProgress, setHashProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [error, setError] = useState<string | null>(null);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());

  const handleScan = async () => {
    try {
      setScanning(true);
      setError(null);
      setHashProgress({ current: 0, total: 0, fileName: '' });

      // Scan directory with content hashing enabled
      const folder = await pickAndScanDirectory({
        enableContentHashing: true,
        onHashProgress: (current, total, fileName) => {
          setHashProgress({ current, total, fileName });
        },
      });

      // Collect all files
      const allFiles = collectAllFiles(folder);
      
      // Find duplicates based on content hash
      const duplicateGroups = findDuplicates(allFiles);

      // Format results
      const formatted: DuplicateGroup[] = duplicateGroups.map((group) => {
        const totalSize = group.reduce((sum, f) => sum + f.size, 0);
        return {
          hash: group[0].contentHash || 'unknown',
          files: group,
          totalSize,
          saveable: totalSize - (group[0]?.size || 0), // Keep first, delete rest
        };
      });

      setDuplicates(formatted.sort((a, b) => b.saveable - a.saveable));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
      setHashProgress({ current: 0, total: 0, fileName: '' });
    }
  };

  const handleToggleSelection = (fileId: string) => {
    const newSelected = new Set(selectedForDeletion);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedForDeletion(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedForDeletion.size === 0) return;

    try {
      for (const fileId of selectedForDeletion) {
        // Find and delete file
        for (const group of duplicates) {
          const file = group.files.find((f) => f.id === fileId);
          if (file && file.handle) {
            try {
              const parentHandle = await (file.handle as any).getParent?.();
              if (parentHandle) {
                await parentHandle.removeEntry(file.name);
              }
            } catch (err) {
              console.warn(`Failed to delete ${file.name}:`, err);
            }
          }
        }
      }
      setSelectedForDeletion(new Set());
      // Refresh scan
      await handleScan();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deletion failed');
    }
  };

  const totalSaveableSpace = duplicates.reduce((sum, g) => sum + g.saveable, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Duplicate Finder (Content-Based)</h2>
          <p className="text-gray-600 text-sm">
            Uses SHA-256 content hashing instead of name/size heuristics for accurate duplicate detection
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {scanning ? 'Scanning...' : 'Scan for Duplicates'}
        </button>
      </div>

      {/* Progress indicator during hashing */}
      {scanning && hashProgress.total > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Hashing files...</span>
            <span className="text-sm text-gray-600">
              {hashProgress.current} / {hashProgress.total}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${(hashProgress.current / hashProgress.total) * 100}%`,
              }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2 truncate">{hashProgress.fileName}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-800">
          {error}
        </div>
      )}

      {duplicates.length > 0 && (
        <>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Duplicate Groups</p>
                <p className="text-2xl font-bold">{duplicates.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Duplicates</p>
                <p className="text-2xl font-bold">
                  {duplicates.reduce((sum, g) => sum + g.files.length, 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Saveable Space</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatBytes(totalSaveableSpace)}
                </p>
              </div>
            </div>
          </div>

          {selectedForDeletion.size > 0 && (
            <div className="flex items-center gap-4 bg-red-50 p-4 rounded-lg border border-red-200">
              <span className="text-sm font-medium">
                {selectedForDeletion.size} file(s) selected for deletion
              </span>
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Delete Selected
              </button>
            </div>
          )}

          <div className="space-y-4">
            {duplicates.map((group) => (
              <DuplicateGroupCard
                key={group.hash}
                group={group}
                selectedForDeletion={selectedForDeletion}
                onToggleSelection={handleToggleSelection}
              />
            ))}
          </div>
        </>
      )}

      {!scanning && duplicates.length === 0 && !error && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600">Click "Scan for Duplicates" to get started</p>
        </div>
      )}
    </div>
  );
};

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  selectedForDeletion: Set<string>;
  onToggleSelection: (fileId: string) => void;
}

const DuplicateGroupCard: React.FC<DuplicateGroupCardProps> = ({
  group,
  selectedForDeletion,
  onToggleSelection,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <div
        className="bg-gray-50 p-4 cursor-pointer flex justify-between items-center hover:bg-gray-100"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-lg">📄</span>
            <div>
              <p className="font-medium">
                {group.files.length} copies • {formatBytes(group.totalSize)} total
              </p>
              <p className="text-xs text-gray-500 font-mono">{group.hash.slice(0, 16)}...</p>
            </div>
          </div>
        </div>
        <div className="text-right pr-4">
          <p className="font-semibold text-amber-600">{formatBytes(group.saveable)}</p>
          <p className="text-xs text-gray-500">saveable</p>
        </div>
        <span className="ml-2">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="border-t border-gray-200 divide-y divide-gray-100 bg-white">
          {group.files.map((file, idx) => (
            <div key={file.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={selectedForDeletion.has(file.id)}
                  onChange={() => onToggleSelection(file.id)}
                  disabled={idx === 0} // Keep first copy
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                </div>
              </div>
              {idx === 0 && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                  Keep
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Collect all files from folder structure recursively
 */
function collectAllFiles(folder: any): FileItem[] {
  const files = [...folder.files];
  for (const subfolder of folder.folders) {
    files.push(...collectAllFiles(subfolder));
  }
  return files;
}
