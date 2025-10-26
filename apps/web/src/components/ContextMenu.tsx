import { useEffect, useRef } from 'react';

export type MenuItem = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  shortcut?: string;
};

type Props = {
  x: number;
  y: number;
  isOpen: boolean;
  items: MenuItem[];
  onClose: () => void;
};

export default function ContextMenu({ x, y, isOpen, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    if (isOpen) {
      window.addEventListener('keydown', onKey);
      window.addEventListener('mousedown', onClick);
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: y,
    left: x,
    zIndex: 1000,
    minWidth: 220,
  };

  return (
    <div ref={ref} style={style} className="bg-slate-800 border border-slate-700 rounded-md shadow-xl py-1">
      {items.map((item, i) => (
        item.divider ? (
          <div key={i} className="my-1 border-t border-slate-700" />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => { onClose(); if (!item.disabled) item.onClick(); }}
            className={`w-full flex items-center justify-between text-left px-3 py-2 text-sm rounded ${
              item.danger ? 'text-red-300 hover:bg-red-900/40' : 'text-slate-200 hover:bg-slate-700'
            } disabled:opacity-50`}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="text-xs text-slate-400">{item.shortcut}</span>}
          </button>
        )
      ))}
    </div>
  );
}
