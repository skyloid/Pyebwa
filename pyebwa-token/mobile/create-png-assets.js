// Create simple PNG placeholders
const fs = require('fs');
const path = require('path');

// Create a minimal PNG file (1x1 pixel, will be stretched)
// This is a base64 encoded 1x1 blue PNG
const bluePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

// Create a minimal PNG file (1x1 pixel white)
const whitePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
);

// Write icon.png (blue)
fs.writeFileSync(path.join(__dirname, 'assets', 'icon.png'), bluePixelPng);

// Write splash.png (white)
fs.writeFileSync(path.join(__dirname, 'assets', 'splash.png'), whitePixelPng);

console.log('Placeholder PNG assets created!');
console.log('Note: These are minimal 1x1 pixel PNGs that will work for development.');
console.log('For production, replace with proper designed assets.');