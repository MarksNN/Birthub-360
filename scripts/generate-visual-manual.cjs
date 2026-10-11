const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'visual-audit-authenticated');
const OUTPUT_DIR = path.join(__dirname, '..', 'visual-manual-output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Function to convert image to base64
function imageToBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  } catch (error) {
    console.error(`Error reading image: ${imagePath}`, error.message);
    return null;
  }
}

// Read summary
const summaryPath = path.join(SCREENSHOTS_DIR, 'summary.json');
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));

// Process each route and convert screenshots
const routesWithScreenshots = [];

for (const result of summary.results) {
  if (result.status === 'success' && result.screenshot) {
    const base64 = imageToBase64(result.screenshot);
    if (base64) {
      routesWithScreenshots.push({
        ...result,
        base64,
      });
    }
  }
}

// Save processed data
const processedPath = path.join(OUTPUT_DIR, 'routes-with-screenshots.json');
fs.writeFileSync(processedPath, JSON.stringify(routesWithScreenshots, null, 2));

console.log(`Processed ${routesWithScreenshots.length} routes with screenshots`);
console.log(`Output saved to: ${processedPath}`);
