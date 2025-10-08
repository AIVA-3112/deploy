// Script to start both frontend and backend servers
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

console.log('Starting both frontend and backend servers...\n');

// Function to start a server
function startServer(command, cwd, name) {
  console.log(`Starting ${name}...`);
  const server = spawn(command, { 
    cwd,
    shell: true,
    stdio: 'pipe'
  });

  server.stdout.on('data', (data) => {
    // Filter out noise and only show important messages
    const message = data.toString();
    if (message.includes('Server is running') || 
        message.includes('AIVA Backend API running') || 
        message.includes('localhost') ||
        message.includes('error') ||
        message.includes('ERROR')) {
      console.log(`[${name}] ${message}`);
    }
  });

  server.stderr.on('data', (data) => {
    console.error(`[${name} ERROR] ${data}`);
  });

  server.on('close', (code) => {
    console.log(`${name} process exited with code ${code}`);
  });

  return server;
}

// Check if server directory exists
const serverDir = join(process.cwd(), 'server');
if (!existsSync(serverDir)) {
  console.error('Server directory not found!');
  process.exit(1);
}

console.log('Make sure you have run "npm install" in both root and server directories.');
console.log('Starting servers in background...\n');

// Start backend server
const backend = startServer('npm run dev', serverDir, 'Backend Server');

// Wait a few seconds for backend to start, then start frontend
setTimeout(() => {
  // Start frontend server
  const frontend = startServer('npm run dev', process.cwd(), 'Frontend Server');
  
  console.log('\nServers starting up...');
  console.log('Frontend will be available at: http://localhost:8080');
  console.log('Backend API will be available at: http://localhost:3001');
  console.log('Press Ctrl+C to stop both servers\n');
}, 3000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down servers...');
  backend.kill();
  // frontend will be undefined if timeout hasn't completed, so check first
  if (typeof frontend !== 'undefined') {
    frontend.kill();
  }
  process.exit(0);
});