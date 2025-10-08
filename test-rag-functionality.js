import axios from 'axios';

// Test script to verify RAG functionality
async function testRAG() {
  try {
    console.log('Testing RAG functionality...');
    
    // Test 1: Check if backend is running
    console.log('\n1. Testing backend connectivity...');
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Backend is running:', healthResponse.data);
    
    // Test 2: Check if frontend is running
    console.log('\n2. Testing frontend connectivity...');
    const frontendResponse = await axios.get('http://localhost:8080/health');
    console.log('✅ Frontend is running:', frontendResponse.data);
    
    // Test 3: Check if workspace API is accessible
    console.log('\n3. Testing workspace API...');
    try {
      const workspaceResponse = await axios.get('http://localhost:3001/api/workspaces', {
        headers: {
          'Authorization': 'Bearer test-token' // This will fail but we can see if the endpoint is accessible
        }
      });
      console.log('✅ Workspace API is accessible');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Workspace API is accessible (requires authentication)');
      } else {
        console.log('❌ Workspace API error:', error.message);
      }
    }
    
    // Test 4: Check Azure Search service
    console.log('\n4. Testing Azure Search service...');
    try {
      const searchStatusResponse = await axios.get('http://localhost:8080/api/document-intelligence/status');
      console.log('✅ Azure Search service status:', searchStatusResponse.data);
    } catch (error) {
      console.log('❌ Azure Search service error:', error.message);
    }
    
    console.log('\n🎉 RAG functionality test completed!');
    console.log('\nTo fully test RAG:');
    console.log('1. Log in to the application');
    console.log('2. Create a workspace');
    console.log('3. Upload a document to the workspace');
    console.log('4. Ask a question about the document in chat');
    console.log('5. Check if the response includes information from the document');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRAG();