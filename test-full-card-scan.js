import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment from different locations
dotenv.config({ path: path.resolve(__dirname, 'updarte/aivafront-main/.env') });

import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import { TableClient, AzureNamedKeyCredential } from '@azure/data-tables';

console.log('=== Full Card Scan Test ===');

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

// Simulate the card scanning process
async function simulateCardScan() {
  console.log('\n=== Simulating Card Scan Process ===');
  
  // Check if we have a test image
  const testImagePath = path.resolve(__dirname, 'test-image.jpg');
  if (!fs.existsSync(testImagePath)) {
    console.log('⚠️ Test image not found. Creating a simple test...');
    
    // Create a simple test without actual image analysis
    console.log('Testing the full flow without actual image:');
    
    // Simulate extracted card data
    const cardData = {
      name: 'John Doe',
      passportNumber: 'P12345678',
      nationality: 'American',
      sex: 'M',
      birthDate: '1990-01-01',
      expiryDate: '2030-01-01',
      documentType: 'Passport',
      issuingCountry: 'USA'
    };
    
    console.log('Extracted card data:', cardData);
    
    // Store in table storage
    if (tableClient) {
      try {
        const rowKey = new Date().getTime().toString();
        const entity = {
          partitionKey: 'admin-cards',
          rowKey,
          timestamp: new Date().toISOString(),
          ...cardData
        };
        
        await tableClient.createEntity(entity);
        console.log('✅ Card data stored in table storage with rowKey:', rowKey);
        
        // Retrieve the stored data
        const storedEntity = await tableClient.getEntity('admin-cards', rowKey);
        console.log('✅ Retrieved stored data:', storedEntity);
        
        // Clean up
        await tableClient.deleteEntity('admin-cards', rowKey);
        console.log('✅ Cleaned up test data');
        
      } catch (error) {
        console.error('❌ Failed to store/retrieve data:', error.message);
      }
    }
    
    return;
  }
  
  // If we have an actual image, process it
  if (documentIntelligenceClient) {
    try {
      console.log('Processing actual image file...');
      const imageBuffer = fs.readFileSync(testImagePath);
      
      console.log('Analyzing document with Azure Document Intelligence...');
      const poller = await documentIntelligenceClient.beginAnalyzeDocument('prebuilt-idDocument', imageBuffer);
      const { documents } = await poller.pollUntilDone();
      
      if (!documents || documents.length === 0) {
        console.log('⚠️ No documents found in the analysis result');
        return;
      }
      
      const document = documents[0];
      const fields = document.fields;
      
      // Extract common passport/card fields
      const cardData = {
        name: (fields.FirstName?.value || '') + ' ' + (fields.LastName?.value || ''),
        passportNumber: fields.DocumentNumber?.value || '',
        nationality: fields.CountryRegion?.value || fields.Nationality?.value || fields.Country?.value || '',
        sex: fields.Sex?.value || fields.Gender?.value || '',
        birthDate: fields.DateOfBirth?.value || '',
        expiryDate: fields.DateOfExpiration?.value || ''
      };
      
      // Clean up name by removing extra spaces
      cardData.name = cardData.name.trim().replace(/\s+/g, ' ');
      
      console.log('Extracted card data:', cardData);
      
      // Store in table storage
      if (tableClient) {
        try {
          const rowKey = new Date().getTime().toString();
          const entity = {
            partitionKey: 'admin-cards',
            rowKey,
            timestamp: new Date().toISOString(),
            ...cardData
          };
          
          await tableClient.createEntity(entity);
          console.log('✅ Card data stored in table storage with rowKey:', rowKey);
        } catch (error) {
          console.error('❌ Failed to store data:', error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Document analysis failed:', error.message);
    }
  }
}

simulateCardScan().catch(console.error);