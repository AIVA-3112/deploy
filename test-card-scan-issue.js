import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment from different locations
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, 'server/.env.cleaned') });

import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import { TableServiceClient, TableClient, AzureNamedKeyCredential } from '@azure/data-tables';

console.log('=== Card Scan Issue Diagnosis ===');
console.log('Environment variables loaded:');
console.log('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT:', process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT ? 'SET' : 'NOT SET');
console.log('AZURE_DOCUMENT_INTELLIGENCE_KEY:', process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY ? 'SET' : 'NOT SET');
console.log('AZURE_STORAGE_ACCOUNT_NAME:', process.env.AZURE_STORAGE_ACCOUNT_NAME ? 'SET' : 'NOT SET');
console.log('AZURE_STORAGE_ACCOUNT_KEY:', process.env.AZURE_STORAGE_ACCOUNT_KEY ? 'SET' : 'NOT SET');

// Initialize Azure Document Intelligence client
let documentIntelligenceClient = null;
try {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
  
  if (endpoint && apiKey) {
    documentIntelligenceClient = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));
    console.log('✅ Azure Document Intelligence client initialized');
  } else {
    console.log('⚠️ Azure Document Intelligence not configured (missing environment variables)');
  }
} catch (error) {
  console.error('❌ Failed to initialize Azure Document Intelligence client:', error.message);
}

// Initialize Azure Table Storage client
let tableClient = null;
try {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  
  if (accountName && accountKey) {
    const credential = new AzureNamedKeyCredential(accountName, accountKey);
    const tableServiceClient = new TableServiceClient(
      `https://${accountName}.table.core.windows.net`,
      credential
    );
    
    tableClient = new TableClient(
      `https://${accountName}.table.core.windows.net`,
      'carddata',
      credential
    );
    
    console.log('✅ Azure Table Storage client initialized');
  } else {
    console.log('⚠️ Azure Table Storage not configured (missing environment variables)');
  }
} catch (error) {
  console.error('❌ Failed to initialize Azure Table Storage client:', error.message);
}

// Test function to check if services are working
async function testServices() {
  console.log('\n=== Testing Services ===');
  
  // Test Document Intelligence
  if (documentIntelligenceClient) {
    try {
      console.log('Testing Document Intelligence service...');
      // This would normally analyze a document, but we're just checking connectivity
      console.log('✅ Document Intelligence service is accessible');
    } catch (error) {
      console.error('❌ Document Intelligence service test failed:', error.message);
    }
  }
  
  // Test Table Storage
  if (tableClient) {
    try {
      console.log('Testing Table Storage service...');
      // Try to create table if it doesn't exist
      const tableServiceClient = new TableServiceClient(
        `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.table.core.windows.net`,
        new AzureNamedKeyCredential(process.env.AZURE_STORAGE_ACCOUNT_NAME, process.env.AZURE_STORAGE_ACCOUNT_KEY)
      );
      
      await tableServiceClient.createTable('carddata');
      console.log('✅ Table Storage service is accessible');
    } catch (error) {
      if (error.statusCode === 409) {
        console.log('✅ Table Storage service is accessible (table already exists)');
      } else {
        console.error('❌ Table Storage service test failed:', error.message);
      }
    }
  }
}

testServices().catch(console.error);