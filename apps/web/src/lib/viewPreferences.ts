// View mode types and utilities

export type ViewMode = 'grid' | 'list' | 'gallery';
export type SortBy = 'name' | 'size' | 'date' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface ViewPreferences {
  mode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  gridSize: number; // 1-5 scale for thumbnail size
  showHiddenFiles: boolean;
}

const STORAGE_KEY = 'fileflow-view-prefs';

const defaultPreferences: ViewPreferences = {
  mode: 'grid',
  sortBy: 'name',
  sortOrder: 'asc',
  gridSize: 3, // Medium size
  showHiddenFiles: false,
};

export function loadViewPreferences(): ViewPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load view preferences:', e);
  }
  return defaultPreferences;
}

export function saveViewPreferences(prefs: Partial<ViewPreferences>): void {
  try {
    const current = loadViewPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save view preferences:', e);
  }
}

// Grid size mapping (1-5 scale to pixel dimensions)
export function getGridItemSize(scale: number): { width: number; height: number } {
  const sizes = [
    { width: 100, height: 120 },  // 1 - Tiny
    { width: 140, height: 160 },  // 2 - Small
    { width: 180, height: 200 },  // 3 - Medium (default)
    { width: 220, height: 240 },  // 4 - Large
    { width: 280, height: 300 },  // 5 - Extra Large
  ];
  const index = Math.max(0, Math.min(4, scale - 1));
  return sizes[index];
}

// Gallery mode uses larger sizes
export function getGalleryItemSize(scale: number): { width: number; height: number } {
  const sizes = [
    { width: 150, height: 150 },  // 1 - Tiny
    { width: 200, height: 200 },  // 2 - Small
    { width: 250, height: 250 },  // 3 - Medium (default)
    { width: 320, height: 320 },  // 4 - Large
    { width: 400, height: 400 },  // 5 - Extra Large
  ];
  const index = Math.max(0, Math.min(4, scale - 1));
  return sizes[index];
}
