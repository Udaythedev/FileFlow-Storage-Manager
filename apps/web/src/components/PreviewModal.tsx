import { useEffect, useMemo, useRef, useState } from 'react';
import type { FileItem } from '../AppTypes';

type Props = {
  files: FileItem[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

function isImage(ext: string) {
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext.toLowerCase());
}
function isVideo(ext: string) {
  return ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'].includes(ext.toLowerCase());
}

export default function PreviewModal({ files, index, onClose, onPrev, onNext }: Props) {
  const file = files[index];
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load blob URL when handle available
  useEffect(() => {
    let currentUrl: string | null = null;
    setUrl(null);
    setError(null);
    if (!file) return;

    async function load() {
      try {
        if (file.handle && (file.handle as any).getFile) {
          const blob = await (file.handle as any).getFile();
          currentUrl = URL.createObjectURL(blob);
          setUrl(currentUrl);
        } else {
          // No handle: cannot preview content; show error
          setError('Preview not available for this file');
        }
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load preview');
      }
    }
    load();
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [file?.id]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  const isImg = isImage(file?.extension ?? '');
  const isVid = isVideo(file?.extension ?? '');

  const title = useMemo(() => file?.name ?? '', [file?.name]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button onClick={onPrev} className="px-3 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 border border-slate-700">← Prev</button>
        <button onClick={onNext} className="px-3 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 border border-slate-700">Next →</button>
        <button onClick={onClose} className="px-3 py-1.5 text-sm rounded bg-red-700/70 hover:bg-red-700 border border-red-800">Close ✕</button>
      </div>

      <div className="max-w-[90vw] max-h-[85vh] w-full h-full flex items-center justify-center p-6">
        <div className="relative bg-slate-900 rounded-lg border border-slate-800 w-full h-full flex items-center justify-center overflow-hidden">
          {error && (
            <div className="text-slate-300 text-sm">{error}</div>
          )}
          {!error && !url && (
            <div className="text-slate-400 text-sm">Loading preview…</div>
          )}
          {!error && url && isImg && (
            <img src={url} alt={title} className="max-w-full max-h-full object-contain" />
          )}
          {!error && url && isVid && (
            <video ref={videoRef} src={url} className="max-w-full max-h-full" controls autoPlay />
          )}
          {!error && url && !isImg && !isVid && (
            <div className="text-slate-400 text-sm">No preview for this file type</div>
          )}

          {/* Title bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <div className="text-white text-sm truncate">{title}</div>
            <div className="text-slate-300 text-xs">{new Date(file.modifiedAt).toLocaleString()} • {(file.size / (1024*1024)).toFixed(2)} MB</div>
          </div>
        </div>
      </div>
    </div>
  );
}
