# Content Hashing for Duplicates - Feature #2

## Overview

Content-based duplicate detection using SHA-256 hashing instead of name+size heuristics.

## Implementation Details

### Core Module: `src/lib/contentHash.ts`

**Functions:**
- `computeFileHash(fileHandle)` - Computes SHA-256 hash of file using File System Access API
  - Supports chunked streaming for large files (64KB chunks)
  - Automatically selects strategy based on file size
  - Memory-efficient for files >640KB
  
- `computeQuickHash(file)` - Fast fallback hash using file.size + lastModified
  - Used for pre-screening before expensive SHA-256 computation
  - Used as fallback if SHA-256 fails
  
- `hashString(text)` - Direct SHA-256 hashing of string data
  - Useful for hashing metadata
  
- `estimateHashTime(fileSizeBytes)` - Estimates hash computation time
  - Helps with progress UX and timeouts
  - Estimates 50MB/sec on modern hardware

**Chunked Hashing Strategy:**
```
Small files (<640KB) → Direct SHA-256 digest
Large files (>640KB) → Streamed in 64KB chunks
```

### Enhanced Duplicate Detection: `src/lib/duplicates.ts`

Updated `findDuplicates()` to:
1. **Prioritize content hash** when available (`f.contentHash`)
2. **Fall back to name+size** heuristic when hash missing
3. **Filter single files** (only groups with 2+ duplicates)

### Enhanced File Scanning: `src/lib/fsAccess.ts`

Extended `pickAndScanDirectory()` with:
- `enableContentHashing: boolean` option
- `onHashProgress` callback for UI updates (current, total, fileName)
- Post-scan hashing phase that:
  - Computes SHA-256 for each file
  - Reports progress for long operations
  - Falls back to quick hash on errors
  - Populates `fileItem.contentHash` field

### New Component: `src/components/DuplicateFinderWithHashing.tsx`

Full-featured duplicate finder UI:
- **Scan button** - Triggers directory pick and content hashing
- **Real-time progress** - Shows hashing progress bar, file name, count
- **Statistics** - Total duplicates, groups, saveable space
- **Expandable groups** - Click to view duplicate files
- **Selective deletion** - Check files for batch deletion (keeps first copy)
- **Error handling** - User-friendly error messages

**Features:**
- Keeps first copy of each duplicate group by default
- Prevents deletion of "Keep" file
- Displays hash preview (first 16 chars) for verification
- Shows file size and savings for each group

## Testing

**Test Coverage:** 34 tests (all passing)

**New Tests (`src/lib/__tests__/contentHash.test.ts`):**
- SHA-256 hashing consistency
- Different strings produce different hashes
- Empty string handling
- Quick hash generation
- Time estimation

**Updated Tests (`src/lib/__tests__/duplicates.test.ts`):**
- Content hash prioritization over name+size
- Fallback when hash missing
- Correct grouping with mixed hashes
- Ignoring single files

## Usage Example

```typescript
// In a React component:
import { DuplicateFinderWithHashing } from './components/DuplicateFinderWithHashing';

export function App() {
  return <DuplicateFinderWithHashing />;
}

// The component handles:
// - Directory selection
// - SHA-256 hashing with progress
// - Duplicate grouping and display
// - Deletion workflows
```

## Performance Characteristics

- **Time Complexity:** O(n × f) where n = file count, f = file size in chunks
- **Space Complexity:** O(n) for hash storage + O(64KB) for chunking buffer
- **Estimated Times:**
  - 1MB file: ~20ms
  - 100MB file: ~2 seconds
  - 1GB file: ~20 seconds (estimates)

## Browser Compatibility

Requires:
- File System Access API (Chrome 86+, Edge 86+)
- Web Crypto API (all modern browsers)
- Dynamic import support

## Integration Points

**Connected to:**
- `FileItem` type (stores `contentHash?: string`)
- `findDuplicates()` function (uses hash for grouping)
- `fsAccess.pickAndScanDirectory()` (computes hashes)
- PWA notifications (could notify on duplicates found)

**Future Enhancements:**
- Parallel hashing for multiple files
- Worker thread offloading for UI responsiveness
- Background hashing in Service Worker
- Cache hashes in IndexedDB for repeat scans
- Configurable chunk size based on device memory

## Build Output

- `dist/assets/index-*.js` - Includes contentHash module (chunked into fsAccess-*.js)
- No new npm dependencies required (uses native Web Crypto)
- Tree-shakeable: unused functions excluded from bundle

---

**Feature Status:** ✅ **COMPLETE**
- Core hashing: Done
- Duplicate detection: Done  
- UI component: Done
- Tests: All passing
- Build: All passing
