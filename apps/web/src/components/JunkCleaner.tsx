import type { FileItem } from '../AppTypes';
import type { JunkFinding } from '../lib/junk';

type Props = {
  findings: JunkFinding[];
  selected: Set<string>;
  onToggle: (fileId: string) => void;
  onToggleAll: (checked: boolean) => void;
  onDeleteSelected: () => Promise<void>;
  deleting: boolean;
  onGoToSource?: (fileId: string) => void;
  onPreview?: (fileId: string) => void;
};

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function JunkCleaner({ findings, selected, onToggle, onToggleAll, onDeleteSelected, deleting, onGoToSource, onPreview }: Props) {
  const total = findings.length;
  const selectedCount = selected.size;
  const totalSize = findings.reduce((acc, f) => acc + (f.item?.size ?? 0), 0);
  const selectedSize = findings.filter(f => selected.has(f.item.id)).reduce((acc, f) => acc + f.item.size, 0);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400">Junk Cleaner</div>
          <div className="text-sm text-slate-300">{total} items • {fmtSize(totalSize)}</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={selectedCount === total && total > 0} onChange={(e) => onToggleAll(e.currentTarget.checked)} />
            Select all
          </label>
          <button disabled={selectedCount === 0 || deleting} onClick={onDeleteSelected} className="px-3 py-1.5 text-sm rounded bg-red-700/70 hover:bg-red-700 disabled:opacity-50 border border-red-800">
            {deleting ? 'Deleting…' : `Delete ${selectedCount > 0 ? `(${selectedCount}, ${fmtSize(selectedSize)})` : ''}`}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto border border-slate-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 sticky top-0">
            <tr className="text-left">
              <th className="px-3 py-2 w-10"></th>
              <th className="px-3 py-2">File</th>
              <th className="px-3 py-2 w-28">Size</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <tr key={f.item.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(f.item.id)} onChange={() => onToggle(f.item.id)} />
                </td>
                <td className="px-3 py-2">
                  <div className="truncate" title={f.item.name}>{f.item.name}</div>
                </td>
                <td className="px-3 py-2 text-slate-300">{fmtSize(f.item.size)}</td>
                <td className="px-3 py-2 text-slate-400 text-xs">{f.reason}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {onGoToSource && (
                      <button onClick={() => onGoToSource(f.item.id)} className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-700">Show in Folder</button>
                    )}
                    {onPreview && (
                      <button onClick={() => onPreview(f.item.id)} className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-700">Preview</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
