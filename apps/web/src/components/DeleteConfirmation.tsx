import { useMemo } from 'react';
import type { FileItem } from '../AppTypes';
import { getFileTypeIcon } from '../lib/fileCategories';

type Props = {
  files: FileItem[];
  thumbnails: Map<string, string>;
  onConfirm: () => void;
  onCancel: () => void;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function DeleteConfirmation({ files, thumbnails, onConfirm, onCancel }: Props) {
  const totalSize = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-slate-900 rounded-lg border border-slate-800 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-red-400">⚠️ Confirm Delete</h2>
          <p className="text-sm text-slate-300 mt-1">
            You are about to permanently delete <strong>{files.length}</strong> {files.length === 1 ? 'file' : 'files'} 
            {' '}(<strong>{formatSize(totalSize)}</strong>)
          </p>
          <p className="text-xs text-slate-400 mt-1">This action cannot be undone.</p>
        </div>

        {/* Preview Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-4 gap-3">
            {files.map((file) => {
              const thumb = thumbnails.get(file.id);
              return (
                <div key={file.id} className="border border-slate-800 rounded-lg p-2 bg-slate-900/60">
                  <div className="aspect-square flex items-center justify-center mb-2 bg-slate-800/50 rounded">
                    {thumb ? (
                      <img src={thumb} alt={file.name} className="max-w-full max-h-full object-contain rounded" />
                    ) : (
                      <span className="text-3xl">{getFileTypeIcon(file.extension)}</span>
                    )}
                  </div>
                  <div className="truncate text-xs font-medium" title={file.name}>{file.name}</div>
                  <div className="text-[10px] text-slate-400">{formatSize(file.size)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded bg-slate-800 hover:bg-slate-700 border border-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded bg-red-700 hover:bg-red-600 border border-red-800 font-medium"
          >
            Delete {files.length} {files.length === 1 ? 'File' : 'Files'}
          </button>
        </div>
      </div>
    </div>
  );
}
