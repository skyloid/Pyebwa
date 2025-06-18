// Simple test to verify backend can start

const http = require('http');

console.log('Testing backend startup...');

// Start backend
const { spawn } = require('child_process');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'pipe'
});

let serverStarted = false;

backend.stdout.on('data', (data) => {
  console.log(`Backend: ${data}`);
  if (data.toString().includes('Server running on port')) {
    serverStarted = true;
    testHealth();
  }
});

backend.stderr.on('data', (data) => {
  console.error(`Backend Error: ${data}`);
});

// Test health endpoint
function testHealth() {
  setTimeout(() => {
    http.get('http://localhost:5000/api/health', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Health check response:', data);
        console.log('✅ Backend is working!');
        backend.kill();
        process.exit(0);
      });
    }).on('error', (err) => {
      console.error('❌ Health check failed:', err.message);
      backend.kill();
      process.exit(1);
    });
  }, 2000);
}

// Timeout after 30 seconds
setTimeout(() => {
  if (!serverStarted) {
    console.error('❌ Backend failed to start within 30 seconds');
    backend.kill();
    process.exit(1);
  }
}, 30000);