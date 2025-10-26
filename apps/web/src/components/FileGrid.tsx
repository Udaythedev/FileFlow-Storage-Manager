import type { FileItem, Folder } from '../AppTypes';

type Props = {
  folder: Folder;
  onDragFileStart?: (file: FileItem) => void;
  onDragFileEnd?: (file: FileItem) => void;
};

export default function FileGrid({ folder, onDragFileStart, onDragFileEnd }: Props) {
  function handleDragStart(e: React.DragEvent, file: FileItem) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ fileId: file.id }));
    e.currentTarget.classList.add('dragging');
    onDragFileStart?.(file);
  }

  function handleDragEnd(e: React.DragEvent, file: FileItem) {
    e.currentTarget.classList.remove('dragging');
    onDragFileEnd?.(file);
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
      {folder.files.map(file => (
        <div
          key={file.id}
          draggable
          onDragStart={(e) => handleDragStart(e, file)}
          onDragEnd={(e) => handleDragEnd(e, file)}
          className="rounded-lg border border-slate-800 p-3 hover:border-slate-700 transition-colors bg-slate-900/60 backdrop-blur"
        >
          <div className="text-3xl mb-2">📄</div>
          <div className="truncate text-sm font-medium" title={file.name}>{file.name}</div>
          <div className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
        </div>
      ))}
    </div>
  );
}
