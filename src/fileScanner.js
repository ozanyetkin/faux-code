import * as fs from 'fs';
import * as path from 'path';

/**
 * Recursively scan a directory for code files
 * @param {string} dir - Directory to scan
 * @param {string[]} extensions - File extensions to include
 * @returns {Array} Array of file objects with path and stats
 */
const scanDirectory = (dir, extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.rs', '.go', '.rb']) => {
  const files = [];
  
  const scan = (currentDir) => {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        // Skip node_modules, .git, and other common ignored directories
        if (entry.isDirectory()) {
          const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '__pycache__', 'venv', 'env'];
          if (!skipDirs.includes(entry.name)) {
            scan(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            const stats = fs.statSync(fullPath);
            files.push({
              path: fullPath,
              name: entry.name,
              mtime: stats.mtime,
              size: stats.size,
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${currentDir}:`, error.message);
    }
  };
  
  scan(dir);
  return files;
};

/**
 * Get the most recently edited n files
 * @param {string} dir - Directory to scan
 * @param {number} count - Number of files to return
 * @returns {Array} Array of the most recently edited files
 */
export const getRecentFiles = (dir, count = 5) => {
  const files = scanDirectory(dir);
  
  // Sort by modification time (most recent first)
  files.sort((a, b) => b.mtime - a.mtime);
  
  // Return the top n files
  return files.slice(0, count);
};

export default { getRecentFiles };
