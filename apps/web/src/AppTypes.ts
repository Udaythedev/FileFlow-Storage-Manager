export type FileItem = {
  id: string;
  name: string;
  size: number; // bytes
  extension: string;
  contentHash?: string; // optional hash for duplicates logic
  modifiedAt: string; // ISO date
  // Real file system handle & parent link when using the File System Access API
  handle?: FileSystemFileHandle;
  parentId?: string;
};

export type Folder = {
  id: string;
  name: string;
  folders: Folder[];
  files: FileItem[];
  // Real directory handle when using the File System Access API
  handle?: FileSystemDirectoryHandle;
};
