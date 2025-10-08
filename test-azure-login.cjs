const https = require('https');

// Test data
const testData = {
  email: 'sudhenreddym@gmail.com',
  password: 'password123'
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'aiva-wchat.azurewebsites.net',
  port: 443,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Sending login request to Azure backend...');
console.log('Request data:', testData);

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response data:', data);
    try {
      const jsonData = JSON.parse(data);
      console.log('Parsed response:', JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.log('Response (not JSON):', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(postData);
req.end();