import type { FileItem, Folder } from '../AppTypes';

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i) : '';
}

let idSeq = 0;
function nextId(prefix: string) { return `${prefix}_${++idSeq}`; }

export type ScanOptions = {
  maxEntries?: number; // safety cap for huge folders
};

export async function pickAndScanDirectory(opts: ScanOptions = {}): Promise<Folder> {
  const picker = (window as any).showDirectoryPicker;
  if (!picker) {
    throw new Error('File System Access API is not supported in this browser. Use Chrome/Edge or the desktop app.');
  }
  const rootHandle: any = await picker();
  idSeq = 0;
  return await scanDirHandle(rootHandle, opts);
}

async function scanDirHandle(dirHandle: any, opts: ScanOptions, parentPath: string = ''): Promise<Folder> {
  const name: string = dirHandle.name ?? 'Root';
  const folder: Folder = { id: nextId('dir'), name, folders: [], files: [], handle: dirHandle };

  let count = 0;
  // for-await is supported on FileSystemDirectoryHandle.entries()
  for await (const [entryName, handle] of dirHandle.entries()) {
    count++;
    if (opts.maxEntries && count > opts.maxEntries) break;
    try {
      if (handle.kind === 'file' || typeof handle.getFile === 'function') {
        const fileObj: File = await handle.getFile();
        const f: FileItem = {
          id: nextId('file'),
          name: fileObj.name,
          size: fileObj.size,
          extension: extOf(fileObj.name),
          modifiedAt: new Date(fileObj.lastModified).toISOString(),
          handle,
          parentId: folder.id,
        };
        folder.files.push(f);
      } else if (handle.kind === 'directory' || typeof handle.entries === 'function') {
        const child = await scanDirHandle(handle, opts, parentPath + '/' + entryName);
        folder.folders.push(child);
      }
    } catch (e) {
      // Skip unreadable entries
      console.warn('Skipping entry due to error:', entryName, e);
    }
  }
  return folder;
}
