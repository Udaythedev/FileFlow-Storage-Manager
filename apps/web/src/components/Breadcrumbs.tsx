type BreadcrumbItem = {
  id: string;
  name: string;
};

type Props = {
  path: BreadcrumbItem[];
  onNavigate: (folderId: string) => void;
};

export default function Breadcrumbs({ path, onNavigate }: Props) {
  if (path.length === 0) return null;

  return (
    <div className="flex items-center gap-1 text-sm text-slate-400">
      {path.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-1">
          {idx > 0 && <span className="text-slate-600">/</span>}
          <button
            onClick={() => onNavigate(item.id)}
            className={`hover:text-slate-200 transition-colors ${
              idx === path.length - 1 ? 'text-slate-200 font-medium' : ''
            }`}
          >
            {item.name}
          </button>
        </div>
      ))}
    </div>
  );
}
