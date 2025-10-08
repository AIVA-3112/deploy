// Simple test to check if servers are running
import { createServer } from 'http';

console.log('Checking if servers are running...');

// Try to connect to backend (port 3001)
import('http').then((http) => {
  const backendReq = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/health',
    method: 'GET'
  }, (res) => {
    console.log(`✅ Backend server is running on port 3001 (Status: ${res.statusCode})`);
  });

  backendReq.on('error', (err) => {
    console.log('❌ Backend server is not running on port 3001');
  });

  backendReq.end();

  // Try to connect to frontend (port 8080)
  const frontendReq = http.request({
    hostname: 'localhost',
    port: 8080,
    path: '/health',
    method: 'GET'
  }, (res) => {
    console.log(`✅ Frontend server is running on port 8080 (Status: ${res.statusCode})`);
  });

  frontendReq.on('error', (err) => {
    console.log('❌ Frontend server is not running on port 8080');
  });

  frontendReq.end();
});