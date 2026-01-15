import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { JSDOM } from 'jsdom';
import FauxCode from './src/FauxCode';
import { getRecentFiles } from './src/fileScanner';
import sharp from 'sharp';

// Configuration
const projectsDir = path.join(os.homedir(), 'Desktop', 'Projects');
const numberOfFiles = 5; // Number of recent files to include
const outputFilename = './fauxcode-wallpaper.png';

// 4K wallpaper dimensions
const WALLPAPER_WIDTH = 3840;
const WALLPAPER_HEIGHT = 2160;

const options = {
  theme: 'dark', // 'light' or 'dark' mode
  fontSize: 4, // Line thickness and width (smaller for multiple files)
  leading: 8, // Space between lines (tighter for multiple files)
  lineCap: 'round', // Line ends 'square' or 'round'
  margin: 30, // Space between canvas edges and code block (smaller)
  lineNumbers: true, // Whether or not to include line numbers
  lineNumberOffset: -3, // Line number offset from margin
};

/**
 * Convert code file content to DOM elements for FauxCode
 */
const codeToDOM = (codeContent, language = 'javascript') => {
  const lines = codeContent.split('\n').slice(0, 30); // Limit to 30 lines per file
  const { window } = new JSDOM(`<!DOCTYPE html><html><body></body></html>`);
  const { document } = window;

  const elements = lines.map((line) => {
    const div = document.createElement('div');
    div.className = 'blob-code-inner';
    const span = document.createElement('span');
    span.textContent = line || '\n';
    div.appendChild(span);
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
    const elements = codeToDOM(content);
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
 */
const combineSVGsToWallpaper = async (svgData) => {
  // Create a background
  const background = await sharp({
    create: {
      width: WALLPAPER_WIDTH,
      height: WALLPAPER_HEIGHT,
      channels: 4,
      background: { r: 13, g: 17, b: 23, alpha: 1 }, // Dark background
    },
  }).png();

  // Calculate grid layout
  const cols = Math.ceil(Math.sqrt(svgData.length));
  const rows = Math.ceil(svgData.length / cols);
  const cellWidth = Math.floor(WALLPAPER_WIDTH / cols);
  const cellHeight = Math.floor(WALLPAPER_HEIGHT / rows);

  // Convert each SVG to PNG and position them
  const composites = [];
  for (let i = 0; i < svgData.length; i++) {
    const { svg, width, height } = svgData[i];

    // Calculate position in grid
    const col = i % cols;
    const row = Math.floor(i / cols);

    // Scale SVG to fit cell while maintaining aspect ratio
    const scale = Math.min(
      (cellWidth - 40) / width,
      (cellHeight - 40) / height
    );
    const scaledWidth = Math.floor(width * scale);
    const scaledHeight = Math.floor(height * scale);

    // Center in cell
    const x = col * cellWidth + (cellWidth - scaledWidth) / 2;
    const y = row * cellHeight + (cellHeight - scaledHeight) / 2;

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
      console.error(`Error converting SVG to PNG:`, error.message);
    }
  }

  // Composite all images onto the background
  const wallpaper = await background
    .composite(composites)
    .toFile(outputFilename);

  console.log(`Wallpaper created: ${outputFilename}`);
  console.log(`Dimensions: ${WALLPAPER_WIDTH}x${WALLPAPER_HEIGHT}`);
  console.log(`Files included: ${svgData.length}`);
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
