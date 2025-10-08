import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Scan, Trash2, Eye, AlertCircle } from 'lucide-react';
import { cardAPI } from '../../utils/api';

const CardManagement: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize and fetch existing cards
  useEffect(() => {
    fetchCards();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cardAPI.getCards();
      setCards(response.cards || []);
    } catch (err: any) {
      setError('Failed to fetch cards: ' + (err.message || 'Unknown error'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    try {
      setIsScanning(true);
      setError(null);
      
      // Call the real API to scan the card
      const result = await cardAPI.scanCard(file);
      
      // Set the scanned data
      setScannedData(result.cardData);
      setIsScanning(false);
      
      // Refresh the cards list
      fetchCards();
    } catch (err: any) {
      setError('Failed to scan card: ' + (err.message || 'Unknown error'));
      setIsScanning(false);
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err: any) {
      setError('Failed to access camera: ' + (err.message || 'Unknown error'));
      console.error(err);
    }
  };

  const captureImage = () => {
    if (videoRef.current && streamRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
            handleFileUpload(file);
          }
        }, 'image/jpeg');
      }
    }
  };

  const deleteCard = async (id: string) => {
    try {
      await cardAPI.deleteCard(id);
      setCards(cards.filter(card => card.rowKey !== id));
    } catch (err: any) {
      setError('Failed to delete card: ' + (err.message || 'Unknown error'));
      console.error(err);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Card Scanning</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-3 flex items-center">
              <Camera className="mr-2 h-5 w-5" />
              Scan with Camera
            </h3>
            
            <div className="space-y-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                {streamRef.current ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-500">
                    <Camera className="mx-auto h-12 w-12 mb-2" />
                    <p>Camera feed will appear here</p>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                {!streamRef.current ? (
                  <button
                    onClick={startCamera}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Start Camera
                  </button>
                ) : (
                  <button
                    onClick={captureImage}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center justify-center"
                  >
                    <Scan className="mr-2 h-4 w-4" />
                    Capture & Scan
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Upload Section */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-3 flex items-center">
              <Upload className="mr-2 h-5 w-5" />
              Upload Card Image
            </h3>
            
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={triggerFileSelect}
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-600 mb-1">Click to upload card image</p>
              <p className="text-sm text-gray-500">Supports JPG, PNG, PDF (Max 10MB)</p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
        
        {/* Scanning Indicator */}
        {isScanning && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-700">Scanning card with Azure Document Intelligence...</span>
          </div>
        )}
      </div>
      
      {/* Scanned Data Form */}
      {scannedData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Scanned Card Data</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Front Side Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Civil ID No</label>
              <input
                type="text"
                value={scannedData.civilIdNo || ''}
                onChange={(e) => setScannedData({...scannedData, civilIdNo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={scannedData.name || ''}
                onChange={(e) => setScannedData({...scannedData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
              <input
                type="text"
                value={scannedData.nationality || ''}
                onChange={(e) => setScannedData({...scannedData, nationality: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
              <input
                type="text"
                value={scannedData.sex || ''}
                onChange={(e) => setScannedData({...scannedData, sex: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
              <input
                type="date"
                value={scannedData.birthDate || ''}
                onChange={(e) => setScannedData({...scannedData, birthDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={scannedData.expiryDate || ''}
                onChange={(e) => setScannedData({...scannedData, expiryDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Back Side Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial No</label>
              <input
                type="text"
                value={scannedData.serialNo || ''}
                onChange={(e) => setScannedData({...scannedData, serialNo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Display any additional fields that were extracted */}
            {Object.entries(scannedData).map(([key, value]) => {
              // Skip the fields we've already displayed
              if (['civilIdNo', 'name', 'nationality', 'sex', 'birthDate', 'expiryDate', 'serialNo'].includes(key)) {
                return null;
              }
              
              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type="text"
                    value={value as string || ''}
                    onChange={(e) => setScannedData({...scannedData, [key]: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 flex space-x-3">
            <button
              onClick={() => setScannedData(null)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-lg"
            >
              Clear
            </button>
          </div>
        </div>
      )}
      
      {/* Stored Cards */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Stored Cards</h2>
          <button 
            onClick={fetchCards}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <span>Refresh</span>
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Eye className="mx-auto h-12 w-12 mb-2" />
            <p>No cards stored yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Civil ID No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nationality</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sex</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birth Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scan Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cards.map((card) => (
                  <tr key={card.rowKey}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{card.civilIdNo || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{card.name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{card.nationality || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{card.sex || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{card.birthDate || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{card.expiryDate || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{card.serialNo || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatTimestamp(card.timestamp)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => deleteCard(card.rowKey)}
                        className="text-red-600 hover:text-red-900 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Display additional details for stored cards */}
            {cards.map((card) => (
              <div key={`details-${card.rowKey}`} className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">Additional Details for Card ID: {card.rowKey}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(card).map(([key, value]) => {
                    // Skip the fields we've already displayed in the table
                    if (['civilIdNo', 'name', 'nationality', 'sex', 'birthDate', 'expiryDate', 'serialNo', 'rowKey', 'partitionKey', 'timestamp'].includes(key)) {
                      return null;
                    }
                    
                    return (
                      <div key={key} className="flex">
                        <span className="font-medium text-gray-600 mr-2 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                        <span className="text-gray-800">{String(value) || 'N/A'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardManagement;