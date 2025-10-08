import axios from 'axios';
import fs from 'fs';

// Test RAG functionality
async function testRAG() {
  try {
    console.log('Testing RAG functionality...\n');
    
    // Test 1: Check if servers are running
    console.log('1. Checking if servers are running...');
    const frontendHealth = await axios.get('http://localhost:8080/health');
    const backendHealth = await axios.get('http://localhost:3001/health');
    console.log('✅ Frontend server is running');
    console.log('✅ Backend server is running\n');
    
    // Test 2: Check Azure services
    console.log('2. Checking Azure services...');
    const docIntelligenceStatus = await axios.get('http://localhost:8080/api/document-intelligence/status');
    console.log(`✅ Document Intelligence: ${docIntelligenceStatus.data.status}`);
    
    // Note: We can't directly test Azure Search service status through the API
    // But we can test it indirectly by trying to create an index
    
    console.log('\n🎉 RAG functionality test completed!');
    console.log('\nTo fully test RAG with a real document:');
    console.log('1. Log in to the application at http://localhost:8080');
    console.log('2. Create a workspace');
    console.log('3. Upload a document to the workspace');
    console.log('4. Ask a question about the document in chat');
    console.log('5. Check if the response includes information from the document');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure both frontend (port 8080) and backend (port 3001) servers are running');
    console.log('2. Check if all environment variables are properly configured');
    console.log('3. Verify Azure services (Document Intelligence, Search, Storage) are properly configured');
  }
}

testRAG();