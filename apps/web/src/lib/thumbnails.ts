// Thumbnail generation and caching using File System Access API + Canvas

import type { FileItem } from '../AppTypes';

const THUMB_SIZE = 200; // Base thumbnail size
const CACHE_NAME = 'fileflow-thumbnails';

// In-memory cache for this session
const memoryCache = new Map<string, string>();

// Check if we can use IndexedDB for persistent cache
let db: IDBDatabase | null = null;

async function initDB(): Promise<IDBDatabase | null> {
  if (db) return db;
  if (!('indexedDB' in window)) return null;

  return new Promise((resolve) => {
    const req = indexedDB.open('FileFlowCache', 1);
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains('thumbnails')) {
        database.createObjectStore('thumbnails', { keyPath: 'id' });
      }
    };
  });
}

async function getCachedThumb(fileId: string): Promise<string | null> {
  // Check memory first
  if (memoryCache.has(fileId)) return memoryCache.get(fileId)!;

  // Check IndexedDB
  const database = await initDB();
  if (!database) return null;

  return new Promise((resolve) => {
    try {
      const tx = database.transaction('thumbnails', 'readonly');
      const store = tx.objectStore('thumbnails');
      const req = store.get(fileId);
      req.onsuccess = () => {
        const result = req.result?.dataUrl ?? null;
        if (result) memoryCache.set(fileId, result);
        resolve(result);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function cacheThumb(fileId: string, dataUrl: string): Promise<void> {
  memoryCache.set(fileId, dataUrl);

  const database = await initDB();
  if (!database) return;

  try {
    const tx = database.transaction('thumbnails', 'readwrite');
    const store = tx.objectStore('thumbnails');
    store.put({ id: fileId, dataUrl });
  } catch (e) {
    console.warn('Failed to cache thumbnail:', e);
  }
}

export async function generateImageThumbnail(file: FileItem): Promise<string | null> {
  if (!file.handle) return null;

  // Check cache
  const cached = await getCachedThumb(file.id);
  if (cached) return cached;

  try {
    const fileHandle = file.handle as FileSystemFileHandle;
    const blob = await (fileHandle as any).getFile();
    
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }

          // Calculate dimensions maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          const aspectRatio = width / height;

          if (width > height) {
            width = THUMB_SIZE;
            height = THUMB_SIZE / aspectRatio;
          } else {
            height = THUMB_SIZE;
            width = THUMB_SIZE * aspectRatio;
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          URL.revokeObjectURL(url);
          cacheThumb(file.id, dataUrl);
          resolve(dataUrl);
        } catch (e) {
          console.error('Canvas error:', e);
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    });
  } catch (e) {
    console.error('Thumbnail generation failed:', e);
    return null;
  }
}

export async function generateVideoThumbnail(file: FileItem): Promise<string | null> {
  if (!file.handle) return null;

  // Check cache
  const cached = await getCachedThumb(file.id);
  if (cached) return cached;

  try {
    const fileHandle = file.handle as FileSystemFileHandle;
    const blob = await (fileHandle as any).getFile();
    
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(blob);
      video.preload = 'metadata';
      video.muted = true;

      video.onloadeddata = () => {
        try {
          // Seek to 10% of video duration for thumbnail
          video.currentTime = Math.min(video.duration * 0.1, 1);
        } catch (e) {
          console.error('Video seek error:', e);
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }

          let width = video.videoWidth;
          let height = video.videoHeight;
          const aspectRatio = width / height;

          if (width > height) {
            width = THUMB_SIZE;
            height = THUMB_SIZE / aspectRatio;
          } else {
            height = THUMB_SIZE;
            width = THUMB_SIZE * aspectRatio;
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(video, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          URL.revokeObjectURL(url);
          cacheThumb(file.id, dataUrl);
          resolve(dataUrl);
        } catch (e) {
          console.error('Video canvas error:', e);
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      video.src = url;
    });
  } catch (e) {
    console.error('Video thumbnail generation failed:', e);
    return null;
  }
}

export async function generateThumbnail(file: FileItem): Promise<string | null> {
  const ext = file.extension.toLowerCase();
  
  // Images
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
    return generateImageThumbnail(file);
  }
  
  // Videos
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'].includes(ext)) {
    return generateVideoThumbnail(file);
  }

  // Other file types don't get thumbnails yet
  return null;
}

export function clearThumbnailCache(): void {
  memoryCache.clear();
  initDB().then((database) => {
    if (!database) return;
    try {
      const tx = database.transaction('thumbnails', 'readwrite');
      const store = tx.objectStore('thumbnails');
      store.clear();
    } catch (e) {
      console.warn('Failed to clear thumbnail cache:', e);
    }
  });
}
