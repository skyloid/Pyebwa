// Quick script to create placeholder assets
const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#00217D"/>
  <circle cx="512" cy="400" r="200" fill="#4CAF50"/>
  <path d="M512 400 L512 724" stroke="#8B4513" stroke-width="40" fill="none"/>
  <text x="512" y="900" font-family="Arial" font-size="120" fill="white" text-anchor="middle">PYEBWA</text>
</svg>
`;

// Create a splash screen SVG
const splashSvg = `
<svg width="1280" height="1280" viewBox="0 0 1280 1280" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="1280" fill="#ffffff"/>
  <circle cx="640" cy="480" r="240" fill="#4CAF50"/>
  <path d="M640 480 L640 880" stroke="#8B4513" stroke-width="48" fill="none"/>
  <text x="640" y="1100" font-family="Arial" font-size="144" fill="#00217D" text-anchor="middle">PYEBWA</text>
  <text x="640" y="1200" font-family="Arial" font-size="72" fill="#D41125" text-anchor="middle">Token</text>
</svg>
`;

// Write files
fs.writeFileSync(path.join(__dirname, 'assets', 'icon.svg'), iconSvg);
fs.writeFileSync(path.join(__dirname, 'assets', 'splash.svg'), splashSvg);

console.log('SVG assets created successfully!');
console.log('Note: For production, convert these to PNG using a tool like:');
console.log('  npx svgexport assets/icon.svg assets/icon.png 1024:1024');
console.log('  npx svgexport assets/splash.svg assets/splash.png 1280:1280');