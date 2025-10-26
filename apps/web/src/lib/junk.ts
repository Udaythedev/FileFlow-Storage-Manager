import type { FileItem } from '../AppTypes';

const junkPatterns: RegExp[] = [/\.tmp$/i, /\.temp$/i, /\.cache$/i, /\.log$/i, /^~.*/];

export type JunkFinding = {
  item: FileItem;
  reason: string;
  safeToDelete: boolean;
};

export function scanForJunkFiles(files: FileItem[]): JunkFinding[] {
  const findings: JunkFinding[] = [];
  for (const f of files) {
    const match = junkPatterns.find((p) => p.test(f.name));
    if (match) {
      findings.push({ item: f, reason: `Matched ${match}`, safeToDelete: true });
    }
  }
  return findings;
}
