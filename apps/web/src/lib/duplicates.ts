import type { FileItem } from '../AppTypes';

export type DuplicateGroup = FileItem[];

// Placeholder hash-based grouping. In the web PWA, true content hashing requires File System Access API.
// For now, we allow an optional `contentHash` property or fall back to name+size heuristic.
export function findDuplicates(files: FileItem[]): DuplicateGroup[] {
  const map = new Map<string, FileItem[]>();
  for (const f of files) {
    const key = f.contentHash ?? `${f.name.toLowerCase()}__${f.size}`;
    const arr = map.get(key) ?? [];
    arr.push(f);
    map.set(key, arr);
  }
  return Array.from(map.values()).filter(g => g.length > 1);
}
