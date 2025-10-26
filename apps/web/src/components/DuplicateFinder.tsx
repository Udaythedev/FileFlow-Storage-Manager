import type { FileItem } from '../AppTypes';

export type DuplicateGroup = FileItem[];

type Props = {
  groups: DuplicateGroup[];
  onDeleteGroup: (groupIdx: number) => Promise<void>;
  deletingGroupIdx: number | null;
  onGoToSource?: (fileId: string) => void;
  onPreview?: (fileId: string) => void;
};

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function DuplicateFinder({ groups, onDeleteGroup, deletingGroupIdx, onGoToSource, onPreview }: Props) {
  const totalFiles = groups.reduce((acc, g) => acc + g.length, 0);
  const totalWasted = groups.reduce((acc, g) => acc + g.slice(1).reduce((s, f) => s + f.size, 0), 0);

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400">Duplicate Finder</div>
          <div className="text-sm text-slate-300">{groups.length} groups • {totalFiles} files • Potential save: {fmtSize(totalWasted)}</div>
        </div>
      </div>
      <div className="flex-1 overflow-auto border border-slate-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/60 sticky top-0">
            <tr className="text-left">
              <th className="px-3 py-2 w-12">#</th>
              <th className="px-3 py-2">Files</th>
              <th className="px-3 py-2 w-28">Size</th>
              <th className="px-3 py-2 w-48">Action</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, idx) => {
              const keep = [...group].sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())[0];
              const toDelete = group.filter(f => f !== keep);
              const wasted = toDelete.reduce((acc, f) => acc + f.size, 0);
              return (
                <tr key={idx} className="border-t border-slate-800 align-top">
                  <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <ul className="space-y-1">
                      {group.map((f) => (
                        <li key={f.id} className="truncate flex items-center gap-2" title={f.name}>
                          <span>{f === keep ? '🛡️' : '🗑️'}</span>
                          <span className="flex-1 truncate">{f.name}</span>
                          {onPreview && (
                            <button className="text-xs px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700" onClick={() => onPreview(f.id)}>Preview</button>
                          )}
                          {onGoToSource && (
                            <button className="text-xs px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700" onClick={() => onGoToSource(f.id)}>Show</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-3 py-2 text-slate-300">{fmtSize(group[0]?.size ?? 0)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        disabled={toDelete.length === 0 || deletingGroupIdx === idx}
                        onClick={() => onDeleteGroup(idx)}
                        className="px-3 py-1.5 text-sm rounded bg-red-700/70 hover:bg-red-700 disabled:opacity-50 border border-red-800"
                      >
                        {deletingGroupIdx === idx ? 'Deleting…' : `Delete ${toDelete.length} dupes (save ${fmtSize(wasted)})`}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
