// File sorting utilities

import type { FileItem } from '../AppTypes';
import type { SortBy, SortOrder } from './viewPreferences';

export function sortFiles(files: FileItem[], sortBy: SortBy, sortOrder: SortOrder): FileItem[] {
  const sorted = [...files].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'date':
        comparison = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
        break;
      case 'type':
        comparison = a.extension.localeCompare(b.extension);
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        }
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

export function getSortIcon(sortBy: SortBy): string {
  const icons = {
    name: '🔤',
    size: '📊',
    date: '📅',
    type: '🏷️',
  };
  return icons[sortBy];
}

export function getSortLabel(sortBy: SortBy): string {
  const labels = {
    name: 'Name',
    size: 'Size',
    date: 'Date Modified',
    type: 'Type',
  };
  return labels[sortBy];
}
