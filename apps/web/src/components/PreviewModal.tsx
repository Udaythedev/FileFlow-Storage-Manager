import { useEffect, useMemo, useRef, useState } from 'react';
import type { FileItem } from '../AppTypes';
import { openWithDefaultApp, getSuggestedApps, canPreviewInBrowser, getMimeType, setPreferredAppForExt, getPreferredAppForExt } from '../lib/fileOpener';

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
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOpenWith, setShowOpenWith] = useState(false);

  // Get suggested apps for this file type
  const suggestedApps = useMemo(() => {
    return getSuggestedApps(file?.extension ?? '');
  }, [file?.extension]);

  const preferredApp = useMemo(() => {
    return getPreferredAppForExt(file?.extension ?? '') ?? '';
  }, [file?.extension]);

  const hasNativePreview = useMemo(() => {
    return canPreviewInBrowser(file?.extension ?? '');
  }, [file?.extension]);

  // Load blob URL when handle available
  useEffect(() => {
    let currentUrl: string | null = null;
    setUrl(null);
    setError(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
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
      if (e.key === 'Escape') {
        if (showOpenWith) {
          setShowOpenWith(false);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
      // Zoom shortcuts
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-' || e.key === '_') handleZoomOut();
      if (e.key === '0') handleZoomReset();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, isFullscreen, showOpenWith]);

  // Fullscreen API
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Zoom handlers
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 5));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Open with external application
  const handleOpenWith = async (appName?: string) => {
    if (!file) return;
    
    const success = await openWithDefaultApp({
      fileHandle: file.handle as FileSystemFileHandle,
      fileName: file.name,
      mimeType: getMimeType(file.extension),
    });

    if (success) {
      // Show toast notification if available
      console.log('File opened/downloaded successfully');
    } else {
      console.error('Failed to open file');
    }
  };

  // Pan handlers for images
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isImg || zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isImg) return;
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const isImg = isImage(file?.extension ?? '');
  const isVid = isVideo(file?.extension ?? '');

  const title = useMemo(() => file?.name ?? '', [file?.name]);

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center ${isFullscreen ? 'bg-black' : ''}`}
    >
      {/* Top Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {/* Open With dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowOpenWith(!showOpenWith)}
            className="px-3 py-1.5 text-sm rounded bg-blue-700/70 hover:bg-blue-700 border border-blue-800"
            title="Open with external application"
          >
            📂 Open With...
          </button>
          
          {showOpenWith && (
            <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl min-w-[200px] z-20">
              <div className="p-2">
                <div className="text-xs text-slate-400 px-2 py-1 mb-1">Suggested Applications:</div>
                {suggestedApps.map((app, idx) => (
                  <div key={idx} className="flex items-center">
                    <button
                      onClick={() => handleOpenWith(app)}
                      className="flex-1 text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded flex items-center gap-2"
                    >
                      <span>{preferredApp && preferredApp === app ? '⭐' : '💾'}</span>
                      <span>{app}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!file) return;
                        setPreferredAppForExt(file.extension, app);
                        // Soft feedback; PreviewModal doesn't have toast, keep it quiet
                      }}
                      className="ml-1 px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200"
                      title={`Make ${app} default for ${file?.extension}`}
                    >
                      Make default
                    </button>
                  </div>
                ))}
                <div className="border-t border-slate-700 mt-2 pt-2">
                  <button
                    onClick={() => handleOpenWith()}
                    className="w-full text-left px-3 py-2 text-sm text-blue-400 hover:bg-slate-700 rounded"
                  >
                    Download & Open
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {isImg && (
          <>
            <button 
              onClick={handleZoomOut} 
              disabled={zoom <= 0.5}
              className="px-3 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50"
              title="Zoom Out (-)"
            >
              🔍-
            </button>
            <span className="px-2 py-1 text-sm text-white bg-slate-800 rounded border border-slate-700">
              {Math.round(zoom * 100)}%
            </span>
            <button 
              onClick={handleZoomIn}
              disabled={zoom >= 5}
              className="px-3 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50"
              title="Zoom In (+)"
            >
              🔍+
            </button>
            <button 
              onClick={handleZoomReset}
              className="px-3 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 border border-slate-700"
              title="Reset Zoom (0)"
            >
              Reset
            </button>
          </>
        )}
        <button 
          onClick={toggleFullscreen}
          className="px-3 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 border border-slate-700"
          title="Toggle Fullscreen (F)"
        >
          {isFullscreen ? '⛶ Exit' : '⛶ Full'}
        </button>
        <button onClick={onPrev} className="px-3 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 border border-slate-700">← Prev</button>
        <button onClick={onNext} className="px-3 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 border border-slate-700">Next →</button>
        <button onClick={onClose} className="px-3 py-1.5 text-sm rounded bg-red-700/70 hover:bg-red-700 border border-red-800">Close ✕</button>
      </div>

      <div className="max-w-[90vw] max-h-[85vh] w-full h-full flex items-center justify-center p-6">
        <div 
          className="relative bg-slate-900 rounded-lg border border-slate-800 w-full h-full flex items-center justify-center overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: isImg && zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {error && (
            <div className="text-slate-300 text-sm">{error}</div>
          )}
          {!error && !url && (
            <div className="text-slate-400 text-sm">Loading preview…</div>
          )}
          {!error && url && isImg && (
            <img 
              ref={imageRef}
              src={url} 
              alt={title} 
              className="max-w-full max-h-full object-contain transition-transform duration-150"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                pointerEvents: 'none',
              }}
            />
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
            <div className="text-slate-300 text-xs">
              {new Date(file.modifiedAt).toLocaleString()} • {(file.size / (1024*1024)).toFixed(2)} MB
              {isImg && zoom > 1 && <span className="ml-2">• {Math.round(zoom * 100)}% • Click and drag to pan</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
