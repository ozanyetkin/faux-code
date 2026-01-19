import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { JSDOM } from 'jsdom';
import FauxCode from './src/FauxCode';
import { getRecentFiles } from './src/fileScanner';
import { highlightCode, tokensToHtml, detectLanguage } from './src/syntaxHighlighter';
import sharp from 'sharp';

// Configuration
const projectsDir = path.join(os.homedir(), 'Desktop', 'Projects');
const numberOfFiles = 12; // Number of recent files to include (4x3 grid)
const outputFilename = './fauxcode-wallpaper.png';

// 4K wallpaper dimensions
const WALLPAPER_WIDTH = 3840;
const WALLPAPER_HEIGHT = 2160;

const options = {
  theme: 'dark', // 'light' or 'dark' mode
  fontSize: 48, // Line thickness and width (same for all faux codes)
  leading: 96, // Space between lines (tighter for multiple files)
  lineCap: 'round', // Line ends 'square' or 'round'
  margin: 24, // Margin around code to prevent cropping
  lineNumbers: false, // Disable line numbers to maximize code area
  lineNumberOffset: -3, // Line number offset from margin
};

/**
 * Convert code file content to DOM elements for FauxCode with syntax highlighting
 */
const codeToDOM = (codeContent, filePath = '') => {
  const maxLineWidth = 120; // Limit max line width to normalize column widths
  const lines = codeContent.split('\n').slice(0, 50); // Limit to 50 lines per file
  const language = detectLanguage(codeContent, filePath);
  const { window } = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
  const { document } = window;

  const elements = lines.map((line) => {
    // Truncate lines longer than maxLineWidth
    const truncatedLine = line.length > maxLineWidth ? line.slice(0, maxLineWidth) : line;
    
    // Highlight code and get tokens
    const tokens = highlightCode(truncatedLine, language);
    const highlightedHtml = tokensToHtml(tokens);

    const div = document.createElement('div');
    div.className = 'blob-code-inner';
    div.innerHTML = highlightedHtml || '&nbsp;';
    return div;
  });

  return elements;
};

/**
 * Generate SVG for a single file
 */
const generateFauxCodeForFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    const elements = codeToDOM(content, filePath);
    const fauxCode = new FauxCode(elements, options);
    return {
      svg: fauxCode.render(),
      width: fauxCode.width,
      height: fauxCode.height,
      fileName,
    };
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error.message);
    return null;
  }
};

/**
 * Combine multiple SVGs into a single 4K PNG wallpaper
 * - Uses a single global scale factor so line thickness is consistent
 * - Packs faux codes tightly edge-to-edge with no gaps
 */
const combineSVGsToWallpaper = async (svgData) => {
  // Create a background
  const background = await sharp({
    create: {
      width: WALLPAPER_WIDTH,
      height: WALLPAPER_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }, // Pure black background (#000000)
    },
  }).png();

  // Grid layout: force exactly 4 columns
  const count = svgData.length;
  const cols = 4;
  const rows = Math.ceil(count / cols);

  // Exact cell dimensions to fill entire wallpaper with no gaps
  const cellWidth = WALLPAPER_WIDTH / cols;
  const cellHeight = WALLPAPER_HEIGHT / rows;

  // Find the maximum faux-code size for consistent scaling
  const maxWidth = Math.max(...svgData.map((s) => s.width));
  const maxHeight = Math.max(...svgData.map((s) => s.height));

  // Calculate scale to fit maximum faux-code into cell dimensions
  const scaleX = cellWidth / maxWidth;
  const scaleY = cellHeight / maxHeight;
  const globalScale = Math.min(scaleX, scaleY);

  // Convert each SVG to PNG and position them edge-to-edge
  const composites = [];
  for (let i = 0; i < svgData.length; i += 1) {
    const { svg, width, height } = svgData[i];

    // Row/column in the grid
    const col = i % cols;
    const row = Math.floor(i / cols);

    // Scale using the shared factor
    const scaledWidth = Math.floor(width * globalScale);
    const scaledHeight = Math.floor(height * globalScale);

    // Place edge-to-edge with no gaps or centering
    const x = col * cellWidth;
    const y = row * cellHeight;

    try {
      const pngBuffer = await sharp(Buffer.from(svg))
        .resize(scaledWidth, scaledHeight)
        .png()
        .toBuffer();

      composites.push({
        input: pngBuffer,
        top: Math.floor(y),
        left: Math.floor(x),
      });
    } catch (error) {
      console.error('Error converting SVG to PNG:', error.message);
    }
  }

  await background.composite(composites).toFile(outputFilename);

  console.log(`Wallpaper created: ${outputFilename}`);
  console.log(`Dimensions: ${WALLPAPER_WIDTH}x${WALLPAPER_HEIGHT}`);
  console.log(`Grid: ${cols}x${rows} (${svgData.length} files)`);
  console.log(`Cell size: ${Math.floor(cellWidth)}x${Math.floor(cellHeight)}px`);
  console.log(`Global scale: ${globalScale.toFixed(3)}x`);
};

// Main execution
(async () => {
  console.log(`Scanning directory: ${projectsDir}`);

  // Get recent files
  const recentFiles = getRecentFiles(projectsDir, numberOfFiles);
  console.log(`Found ${recentFiles.length} recent files:`);
  recentFiles.forEach((file, i) => {
    console.log(`  ${i + 1}. ${file.name} (${file.path})`);
  });

  // Generate faux code for each file
  const svgData = [];
  for (const file of recentFiles) {
    const result = generateFauxCodeForFile(file.path);
    if (result) {
      svgData.push(result);
    }
  }

  if (svgData.length === 0) {
    console.error('No valid code files found to generate wallpaper.');
    return;
  }

  // Combine into wallpaper
  await combineSVGsToWallpaper(svgData);
})();
