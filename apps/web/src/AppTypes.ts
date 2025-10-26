export type FileItem = {
  id: string;
  name: string;
  size: number; // bytes
  extension: string;
  contentHash?: string; // optional hash for duplicates logic
  modifiedAt: string; // ISO date
};

export type Folder = {
  id: string;
  name: string;
  folders: Folder[];
  files: FileItem[];
};
