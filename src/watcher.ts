import * as fs from 'fs';
import * as path from 'path';
import { updateFile, loadIndex } from './indexer';
import { IGNORED_DIRS, IGNORED_EXTENSIONS, IGNORED_FILES } from './constants';

// ── File Watcher ────────────────────────────────────────────────────────────
// Watches for file changes and incrementally updates the index.
// Uses Node.js built-in fs.watch — zero dependencies.
// Debounces rapid changes (e.g., save-on-type) to avoid thrashing.

interface WatcherOptions {
  root: string;
  debounceMs?: number;
  onUpdate?: (file: string) => void;
  onError?: (error: Error) => void;
}

export function startWatcher(options: WatcherOptions): { stop: () => void } {
  const { root, debounceMs = 500, onUpdate, onError } = options;
  const watchers: fs.FSWatcher[] = [];
  const pendingUpdates = new Map<string, NodeJS.Timeout>();

  function shouldIgnore(filePath: string): boolean {
    const relPath = path.relative(root, filePath).replace(/\\/g, '/');
    const parts = relPath.split('/');

    // Check ignored directories
    for (const part of parts) {
      if (IGNORED_DIRS.has(part)) return true;
    }

    // Check ignored files
    const basename = path.basename(filePath);
    if (IGNORED_FILES.has(basename)) return true;

    // Check ignored extensions
    const ext = path.extname(filePath).toLowerCase();
    if (IGNORED_EXTENSIONS.has(ext)) return true;

    // Don't watch our own index
    if (relPath.startsWith('.ccs/')) return true;

    return false;
  }

  function handleChange(eventType: string, filename: string | null, dir: string) {
    if (!filename) return;

    const fullPath = path.join(dir, filename);
    if (shouldIgnore(fullPath)) return;

    // Debounce: if the same file changes rapidly, wait for it to settle
    const existing = pendingUpdates.get(fullPath);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      pendingUpdates.delete(fullPath);
      try {
        updateFile(root, fullPath);
        onUpdate?.(fullPath);
      } catch (err) {
        onError?.(err as Error);
      }
    }, debounceMs);

    pendingUpdates.set(fullPath, timeout);
  }

  function watchDir(dir: string) {
    try {
      const watcher = fs.watch(dir, { persistent: true }, (eventType, filename) => {
        handleChange(eventType, filename, dir);

        // If a new directory was created, watch it too
        if (filename && eventType === 'rename') {
          const newPath = path.join(dir, filename);
          try {
            if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
              if (!shouldIgnore(newPath)) {
                watchDir(newPath);
              }
            }
          } catch { /* ignore stat errors */ }
        }
      });

      watchers.push(watcher);
    } catch (err) {
      onError?.(err as Error);
    }

    // Recursively watch subdirectories
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) {
          const subDir = path.join(dir, entry.name);
          const relPath = path.relative(root, subDir).replace(/\\/g, '/');
          if (!relPath.startsWith('.ccs')) {
            watchDir(subDir);
          }
        }
      }
    } catch { /* ignore readdir errors */ }
  }

  // Start watching
  watchDir(root);

  return {
    stop() {
      for (const w of watchers) {
        try { w.close(); } catch { /* ignore */ }
      }
      watchers.length = 0;
      for (const timeout of pendingUpdates.values()) {
        clearTimeout(timeout);
      }
      pendingUpdates.clear();
    },
  };
}
