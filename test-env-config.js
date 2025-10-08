import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Current directory:', __dirname);
console.log('Loading .env from:', path.resolve(__dirname, '.env'));

// Load environment variables from .env file in current directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('=== Environment Variables Check ===');
console.log('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT:', process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT ? 'SET' : 'NOT SET');
console.log('AZURE_DOCUMENT_INTELLIGENCE_KEY:', process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY ? 'SET' : 'NOT SET');
console.log('AZURE_STORAGE_ACCOUNT_NAME:', process.env.AZURE_STORAGE_ACCOUNT_NAME ? 'SET' : 'NOT SET');
console.log('AZURE_STORAGE_ACCOUNT_KEY:', process.env.AZURE_STORAGE_ACCOUNT_KEY ? 'SET' : 'NOT SET');

if (process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT) {
  console.log('✅ Azure Document Intelligence endpoint is configured');
} else {
  console.log('❌ Azure Document Intelligence endpoint is missing');
}

if (process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY) {
  console.log('✅ Azure Document Intelligence key is configured');
} else {
  console.log('❌ Azure Document Intelligence key is missing');
}

if (process.env.AZURE_STORAGE_ACCOUNT_NAME) {
  console.log('✅ Azure Storage account name is configured');
} else {
  console.log('❌ Azure Storage account name is missing');
}

if (process.env.AZURE_STORAGE_ACCOUNT_KEY) {
  console.log('✅ Azure Storage account key is configured');
} else {
  console.log('❌ Azure Storage account key is missing');
}