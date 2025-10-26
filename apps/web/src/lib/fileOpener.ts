/**
 * Utility to open files with external applications
 */

export interface OpenWithOptions {
  fileHandle?: FileSystemFileHandle;
  fileName: string;
  mimeType?: string;
}

/**
 * Open a file with the system's default application
 */
export async function openWithDefaultApp(options: OpenWithOptions): Promise<boolean> {
  const { fileHandle, fileName, mimeType } = options;

  try {
    if (fileHandle) {
      // If we have a file handle, get the File object
      const file = await fileHandle.getFile();
      
      // Create a URL and trigger download which will prompt user to open with app
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
      return true;
    } else {
      throw new Error('No file handle available');
    }
  } catch (error) {
    console.error('Failed to open file:', error);
    return false;
  }
}

/**
 * Get suggested applications based on file extension
 */
export function getSuggestedApps(extension: string): string[] {
  const ext = extension.toLowerCase();
  const preferred = getPreferredAppForExt(ext);

  const appMap: Record<string, string[]> = {
    // Documents
    '.pdf': ['Adobe Acrobat', 'PDF Reader', 'Browser'],
    '.doc': ['Microsoft Word', 'Google Docs', 'LibreOffice Writer'],
    '.docx': ['Microsoft Word', 'Google Docs', 'LibreOffice Writer'],
    '.xls': ['Microsoft Excel', 'Google Sheets', 'LibreOffice Calc'],
    '.xlsx': ['Microsoft Excel', 'Google Sheets', 'LibreOffice Calc'],
    '.ppt': ['Microsoft PowerPoint', 'Google Slides', 'LibreOffice Impress'],
    '.pptx': ['Microsoft PowerPoint', 'Google Slides', 'LibreOffice Impress'],
    '.txt': ['Notepad', 'VS Code', 'Notepad++'],
    
    // Code
    '.js': ['VS Code', 'Sublime Text', 'Notepad++'],
    '.ts': ['VS Code', 'Sublime Text', 'WebStorm'],
    '.jsx': ['VS Code', 'Sublime Text', 'WebStorm'],
    '.tsx': ['VS Code', 'Sublime Text', 'WebStorm'],
    '.py': ['VS Code', 'PyCharm', 'Sublime Text'],
    '.java': ['IntelliJ IDEA', 'Eclipse', 'VS Code'],
    '.cpp': ['VS Code', 'Visual Studio', 'CLion'],
    '.c': ['VS Code', 'Visual Studio', 'CLion'],
    '.html': ['VS Code', 'Browser', 'Sublime Text'],
    '.css': ['VS Code', 'Sublime Text', 'WebStorm'],
    '.json': ['VS Code', 'Notepad++', 'Sublime Text'],
    
    // Media
    '.mp3': ['Windows Media Player', 'VLC', 'Spotify'],
    '.wav': ['Windows Media Player', 'VLC', 'Audacity'],
    '.flac': ['VLC', 'Foobar2000', 'MusicBee'],
    '.mp4': ['VLC', 'Windows Media Player', 'MPC-HC'],
    '.avi': ['VLC', 'Windows Media Player', 'MPC-HC'],
    '.mkv': ['VLC', 'MPC-HC', 'PotPlayer'],
    '.mov': ['VLC', 'QuickTime', 'Windows Media Player'],
    
    // Images
    '.psd': ['Adobe Photoshop', 'GIMP', 'Photopea'],
    '.ai': ['Adobe Illustrator', 'Inkscape', 'CorelDRAW'],
    '.svg': ['Browser', 'Inkscape', 'Adobe Illustrator'],
    '.raw': ['Adobe Lightroom', 'Capture One', 'RawTherapee'],
    '.cr2': ['Adobe Lightroom', 'Capture One', 'RawTherapee'],
    
    // Archives
    '.zip': ['WinRAR', '7-Zip', 'Windows Explorer'],
    '.rar': ['WinRAR', '7-Zip', 'PeaZip'],
    '.7z': ['7-Zip', 'WinRAR', 'PeaZip'],
    '.tar': ['7-Zip', 'WinRAR', 'PeaZip'],
    '.gz': ['7-Zip', 'WinRAR', 'PeaZip'],
    
    // 3D/CAD
    '.blend': ['Blender'],
    '.fbx': ['Blender', 'Maya', '3ds Max'],
    '.obj': ['Blender', 'Maya', '3ds Max'],
    '.stl': ['Blender', 'MeshLab', 'Cura'],
    '.dwg': ['AutoCAD', 'LibreCAD', 'FreeCAD'],
    
    // Databases
    '.db': ['DB Browser for SQLite', 'DBeaver', 'SQLite Studio'],
    '.sqlite': ['DB Browser for SQLite', 'DBeaver', 'SQLite Studio'],
    '.sql': ['VS Code', 'MySQL Workbench', 'DBeaver'],
  };
  const list = appMap[ext] || ['Default Application'];
  if (preferred && list.includes(preferred)) {
    // Sort preferred to the front
    return [preferred, ...list.filter(a => a !== preferred)];
  }
  return list;
}

/**
 * Check if a file type can be previewed in the browser
 */
export function canPreviewInBrowser(extension: string): boolean {
  const ext = extension.toLowerCase();
  const previewableTypes = [
    // Images
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg',
    // Videos
    '.mp4', '.mov', '.webm', '.m4v',
    // Text/Code
    '.txt', '.md', '.json', '.html', '.css', '.js', '.ts',
    // PDFs (can be previewed but might want external viewer)
    '.pdf'
  ];
  
  return previewableTypes.includes(ext);
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(extension: string): string {
  const ext = extension.toLowerCase();
  const mimeTypes: Record<string, string> = {
    // Images
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    
    // Videos
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    
    // Audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    
    // Documents
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    
    // Archives
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    
    // Text
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

// Preferred app storage
const PREFERRED_KEY = 'fileflow.preferredOpenWith';
let __memPrefStore: PrefStore | null = null;

type PrefStore = Record<string, string>; // ext -> app name

function readPrefs(): PrefStore {
  try {
    if (typeof localStorage === 'undefined') {
      return __memPrefStore ?? {};
    }
    const raw = localStorage.getItem(PREFERRED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writePrefs(p: PrefStore) {
  try {
    if (typeof localStorage === 'undefined') {
      __memPrefStore = { ...p };
      return;
    }
    localStorage.setItem(PREFERRED_KEY, JSON.stringify(p));
  } catch {}
}

export function getPreferredAppForExt(extension: string): string | null {
  const prefs = readPrefs();
  const ext = extension.toLowerCase();
  return prefs[ext] ?? null;
}

export function setPreferredAppForExt(extension: string, appName: string) {
  const prefs = readPrefs();
  const ext = extension.toLowerCase();
  prefs[ext] = appName;
  writePrefs(prefs);
}
