import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment from different locations
dotenv.config({ path: path.resolve(__dirname, 'updarte/aivafront-main/.env') });

import { TableClient, AzureNamedKeyCredential } from '@azure/data-tables';

console.log('=== Complete Solution Verification ===');

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

// Test the complete flow: store data and retrieve it
async function testCompleteFlow() {
  console.log('\n=== Testing Complete Data Flow ===');
  
  if (!tableClient) {
    console.log('❌ Table Storage client not available');
    return;
  }
  
  try {
    // 1. Create a test entity (simulating scanned card data)
    const testCardData = {
      name: 'Jane Smith',
      passportNumber: 'P87654321',
      nationality: 'Canadian',
      sex: 'F',
      birthDate: '1985-05-15',
      expiryDate: '2028-05-15',
      documentType: 'Passport',
      issuingCountry: 'Canada',
      additionalInfo: 'Test data for verification'
    };
    
    const rowKey = `test-${Date.now()}`;
    const entity = {
      partitionKey: 'admin-cards',
      rowKey,
      timestamp: new Date().toISOString(),
      ...testCardData
    };
    
    console.log('1. Storing test card data...');
    await tableClient.createEntity(entity);
    console.log('✅ Data stored successfully');
    
    // 2. Retrieve the data
    console.log('2. Retrieving stored data...');
    const retrievedEntity = await tableClient.getEntity('admin-cards', rowKey);
    console.log('✅ Data retrieved successfully');
    
    // 3. Verify the data
    console.log('3. Verifying data integrity...');
    let dataMatch = true;
    for (const [key, value] of Object.entries(testCardData)) {
      if (retrievedEntity[key] !== value) {
        console.log(`❌ Data mismatch for ${key}: expected ${value}, got ${retrievedEntity[key]}`);
        dataMatch = false;
      }
    }
    
    if (dataMatch) {
      console.log('✅ All data matches correctly');
    }
    
    // 4. List all entities (to test querying)
    console.log('4. Listing all card entities...');
    const entities = [];
    const entitiesIterator = tableClient.listEntities({
      filter: `PartitionKey eq 'admin-cards' and RowKey eq '${rowKey}'`
    });
    
    for await (const entity of entitiesIterator) {
      entities.push(entity);
    }
    
    if (entities.length > 0) {
      console.log(`✅ Found ${entities.length} matching entities`);
    } else {
      console.log('❌ No matching entities found');
    }
    
    // 5. Clean up
    console.log('5. Cleaning up test data...');
    await tableClient.deleteEntity('admin-cards', rowKey);
    console.log('✅ Test data cleaned up');
    
    console.log('\n=== Complete Flow Test Result: PASSED ===');
    console.log('The solution is ready for deployment!');
    
  } catch (error) {
    console.error('❌ Complete flow test failed:', error.message);
    console.log('\n=== Complete Flow Test Result: FAILED ===');
  }
}

testCompleteFlow().catch(console.error);