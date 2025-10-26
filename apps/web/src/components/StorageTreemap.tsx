import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

type Node = {
  name: string;
  size: number;
  children?: Node[];
};

export default function StorageTreemap({ data }: { data: Node }) {
  return (
    <div className="h-full w-full">
      <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Storage Treemap</div>
      <div className="h-[calc(100%-1rem)] border border-slate-800 rounded-lg overflow-hidden bg-slate-900/60">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data.children ?? []}
            dataKey="size"
            stroke="#0f172a"
            aspectRatio={4 / 3}
            fill="#64748b"
          >
            <Tooltip cursor={{ fill: 'rgba(148,163,184,0.1)' }} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
