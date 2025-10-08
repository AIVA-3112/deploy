import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import multer from 'multer';
import dotenv from 'dotenv';

// Load environment variables from server/.env file
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env.cleaned') });

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Initialize Azure Document Intelligence client (if environment variables are available)
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

// Add comprehensive CORS headers for all requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Client-ID');
  res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Page-Count');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint (placed before proxy to avoid interference)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.status(200).json({ 
    message: 'Server is running correctly', 
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
});

// Proxy API requests to the backend service with CORS handling
const API_BASE_URL = 'https://web-production-50913.up.railway.app/';

// Custom middleware to handle API requests - PLACE BEFORE BODY PARSING
app.use((req, res, next) => {
  // Check if the request is for an API endpoint
  if (req.url.startsWith('/api/') && 
      !req.url.startsWith('/api/document-intelligence') &&
      !req.url.startsWith('/api/admin/cards/scan')) {
    console.log('API request:', req.method, req.url);
    
    // Create proxy middleware
    const proxy = createProxyMiddleware({
      target: API_BASE_URL,
      changeOrigin: true,
      secure: true,
      // Preserve the original path
      pathRewrite: {
        '^/api': '/api'
      },
      on: {
        proxyReq: function (proxyReq, req, res) {
          console.log('Forwarding to backend:', req.method, req.url);
        },
        proxyRes: function (proxyRes, req, res) {
          console.log('Backend response status:', proxyRes.statusCode);
          // Add CORS headers to proxied responses
          proxyRes.headers['Access-Control-Allow-Origin'] = '*';
          proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
          proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Client-ID';
          proxyRes.headers['Access-Control-Expose-Headers'] = 'X-Total-Count, X-Page-Count';
          proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
        },
        error: function (err, req, res) {
          console.error('Proxy error:', err);
          res.status(500).json({ error: 'Proxy error', message: err.message });
        }
      }
    });
    
    // Apply the proxy middleware to this request
    proxy(req, res, next);
  } else {
    // Not an API request or it's a document-intelligence request, continue with other middleware
    next();
  }
});

// Body parsing middleware for JSON and form data - PLACE AFTER PROXY
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Azure Document Intelligence API endpoints
// Direct card scanning endpoint (bypassing backend)
app.post('/api/document-intelligence/scan-card', upload.single('cardImage'), async (req, res) => {
  try {
    if (!documentIntelligenceClient) {
      return res.status(503).json({ error: 'Azure Document Intelligence service is not available' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing card scan request with Azure Document Intelligence');
    
    // Get optional custom model ID from query parameters
    const modelId = req.query.modelId ? String(req.query.modelId) : 'prebuilt-idDocument';
    
    // Analyze the document using Azure Document Intelligence
    const poller = await documentIntelligenceClient.beginAnalyzeDocument(modelId, req.file.buffer);
    const { documents } = await poller.pollUntilDone();
    
    if (!documents || documents.length === 0) {
      return res.status(400).json({ error: 'No documents found in the analysis result' });
    }
    
    const document = documents[0];
    const fields = document.fields;
    
    // Extract card fields as per requirements
    const cardData = {
      // Front side fields
      civilIdNo: fields.DocumentNumber?.value || '',
      name: (fields.FirstName?.value || '') + ' ' + (fields.LastName?.value || ''),
      nationality: fields.CountryRegion?.value || fields.Nationality?.value || fields.Country?.value || '',
      sex: fields.Sex?.value || fields.Gender?.value || '',
      birthDate: fields.DateOfBirth?.value || '',
      expiryDate: fields.DateOfExpiration?.value || '',
      
      // Back side fields
      serialNo: (fields.SerialNumber?.value || '') || (fields.DocumentNumber?.value || '')
    };
    
    // Clean up name by removing extra spaces
    cardData.name = cardData.name.trim().replace(/\s+/g, ' ');
    
    // Try alternative field names for nationality if not found
    if (!cardData.nationality) {
      // Check for common alternative field names
      const nationalityFields = ['Nationality', 'Country', 'IssuingCountry', 'CountryOfIssue'];
      for (const field of nationalityFields) {
        const value = fields[field]?.value;
        if (value) {
          cardData.nationality = String(value);
          break;
        }
      }
    }
    
    // Format birth date to show only date part (not time)
    if (cardData.birthDate) {
      const birthDate = new Date(cardData.birthDate);
      if (!isNaN(birthDate.getTime())) {
        cardData.birthDate = birthDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      }
    }
    
    // Format expiry date to show only date part (not time)
    if (cardData.expiryDate) {
      const expiryDate = new Date(cardData.expiryDate);
      if (!isNaN(expiryDate.getTime())) {
        cardData.expiryDate = expiryDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      }
    }
    
    // Try alternative field names for serial number if not found
    if (!cardData.serialNo) {
      const serialNoFields = ['SerialNumber', 'DocumentNumber', 'IDNumber'];
      for (const field of serialNoFields) {
        const value = fields[field]?.value;
        if (value) {
          cardData.serialNo = String(value);
          break;
        }
      }
    }
    
    // Add any additional fields that might be present
    for (const [key, value] of Object.entries(fields)) {
      // Skip fields we've already processed
      const processedFields = ['FirstName', 'LastName', 'DocumentNumber', 'CountryRegion', 'Nationality', 'Country', 'Sex', 'Gender', 'DateOfBirth', 'DateOfExpiration', 'SerialNumber', 'IDNumber', 'IssuingCountry', 'CountryOfIssue'];
      if (!processedFields.includes(key) && !(key in cardData) && value && 'value' in value) {
        cardData[key] = String(value.value);
      }
    }
    
    console.log('Successfully analyzed card document', cardData);
    
    res.json({
      message: 'Card scanned successfully',
      cardData
    });
  } catch (error) {
    console.error('Card scan error:', error);
    res.status(500).json({ 
      error: 'Failed to scan card',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin card scanning endpoint (for frontend compatibility)
app.post('/api/admin/cards/scan', upload.single('cardImage'), async (req, res) => {
  try {
    if (!documentIntelligenceClient) {
      return res.status(503).json({ error: 'Azure Document Intelligence service is not available' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing admin card scan request with Azure Document Intelligence');
    
    // Get optional custom model ID from query parameters
    const modelId = req.query.modelId ? String(req.query.modelId) : 'prebuilt-idDocument';
    
    // Analyze the document using Azure Document Intelligence
    const poller = await documentIntelligenceClient.beginAnalyzeDocument(modelId, req.file.buffer);
    const { documents } = await poller.pollUntilDone();
    
    if (!documents || documents.length === 0) {
      return res.status(400).json({ error: 'No documents found in the analysis result' });
    }
    
    const document = documents[0];
    const fields = document.fields;
    
    // Extract card fields as per requirements
    const cardData = {
      // Front side fields
      civilIdNo: fields.DocumentNumber?.value || '',
      name: (fields.FirstName?.value || '') + ' ' + (fields.LastName?.value || ''),
      nationality: fields.CountryRegion?.value || fields.Nationality?.value || fields.Country?.value || '',
      sex: fields.Sex?.value || fields.Gender?.value || '',
      birthDate: fields.DateOfBirth?.value || '',
      expiryDate: fields.DateOfExpiration?.value || '',
      
      // Back side fields
      serialNo: (fields.SerialNumber?.value || '') || (fields.DocumentNumber?.value || '')
    };
    
    // Clean up name by removing extra spaces
    cardData.name = cardData.name.trim().replace(/\s+/g, ' ');
    
    // Try alternative field names for nationality if not found
    if (!cardData.nationality) {
      // Check for common alternative field names
      const nationalityFields = ['Nationality', 'Country', 'IssuingCountry', 'CountryOfIssue'];
      for (const field of nationalityFields) {
        const value = fields[field]?.value;
        if (value) {
          cardData.nationality = String(value);
          break;
        }
      }
    }
    
    // Format birth date to show only date part (not time)
    if (cardData.birthDate) {
      const birthDate = new Date(cardData.birthDate);
      if (!isNaN(birthDate.getTime())) {
        cardData.birthDate = birthDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      }
    }
    
    // Format expiry date to show only date part (not time)
    if (cardData.expiryDate) {
      const expiryDate = new Date(cardData.expiryDate);
      if (!isNaN(expiryDate.getTime())) {
        cardData.expiryDate = expiryDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      }
    }
    
    // Try alternative field names for serial number if not found
    if (!cardData.serialNo) {
      const serialNoFields = ['SerialNumber', 'DocumentNumber', 'IDNumber'];
      for (const field of serialNoFields) {
        const value = fields[field]?.value;
        if (value) {
          cardData.serialNo = String(value);
          break;
        }
      }
    }
    
    // Add any additional fields that might be present
    for (const [key, value] of Object.entries(fields)) {
      // Skip fields we've already processed
      const processedFields = ['FirstName', 'LastName', 'DocumentNumber', 'CountryRegion', 'Nationality', 'Country', 'Sex', 'Gender', 'DateOfBirth', 'DateOfExpiration', 'SerialNumber', 'IDNumber', 'IssuingCountry', 'CountryOfIssue'];
      if (!processedFields.includes(key) && !(key in cardData) && value && 'value' in value) {
        cardData[key] = String(value.value);
      }
    }
    
    console.log('Successfully analyzed card document', cardData);
    
    res.json({
      message: 'Card scanned successfully',
      cardData
    });
  } catch (error) {
    console.error('Card scan error:', error);
    res.status(500).json({ 
      error: 'Failed to scan card',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check Azure Document Intelligence service status
app.get('/api/document-intelligence/status', (req, res) => {
  res.json({
    service: 'Azure Document Intelligence',
    status: documentIntelligenceClient ? 'available' : 'unavailable',
    endpoint: process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || null,
    message: documentIntelligenceClient 
      ? 'Service is ready to process documents' 
      : 'Service is not configured. Please set AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY environment variables.'
  });
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing - serve index.html for all non-API routes
app.get(/^\/(?!api|health|test).*$/, (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message 
  });
});

// Get port from environment variable or default to 8080
const PORT = 8080; // Explicitly set to 8080 as requested

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check endpoint: http://localhost:${PORT}/health`);
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Node version: ${process.version}`);
  
  // Show Azure Document Intelligence status
  if (documentIntelligenceClient) {
    console.log(`Azure Document Intelligence: Connected to ${process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT}`);
  } else {
    console.log('Azure Document Intelligence: Not configured');
  }
})
.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});