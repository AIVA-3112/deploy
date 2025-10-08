import React, { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { ArrowLeft, Camera, Upload, Scan, AlertCircle, X } from 'lucide-react';
import { cardAPI } from '../utils/api';

const CardScanning: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);
  
  // New states for front and back card images
  const [frontCardImage, setFrontCardImage] = useState<string | null>(null);
  const [backCardImage, setBackCardImage] = useState<string | null>(null);
  const [frontCardFile, setFrontCardFile] = useState<File | null>(null);
  const [backCardFile, setBackCardFile] = useState<File | null>(null);
  const [currentSide, setCurrentSide] = useState<'front' | 'back' | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const handleFileUpload = async (file: File, side: 'front' | 'back') => {
    if (!file) return;

    try {
      setError(null);
      
      // Save the image for display and file for scanning
      const imageUrl = URL.createObjectURL(file);
      if (side === 'front') {
        setFrontCardImage(imageUrl);
        setFrontCardFile(file);
      } else {
        setBackCardImage(imageUrl);
        setBackCardFile(file);
      }
      
      // Check if both sides are available to scan
      // Use setTimeout to ensure state is updated before checking
      setTimeout(() => {
        // Get current values directly from state setters
        const hasFront = side === 'front' ? true : !!frontCardFile;
        const hasBack = side === 'back' ? true : !!backCardFile;
        
        if (hasFront && hasBack) {
          // Both sides are available, run the scan
          scanBothSides(side === 'front' ? file : frontCardFile!, side === 'back' ? file : backCardFile!);
        }
      }, 0);
    } catch (err: any) {
      setError('Failed to process card: ' + (err.message || 'Unknown error'));
      console.error(err);
    }
  };

  const scanBothSides = async (frontFile: File, backFile: File) => {
    if (!frontFile || !backFile) return;

    try {
      setIsScanning(true);
      setLoading(true);
      setError(null);
      
      // Scan front side
      const frontResult = await cardAPI.scanCard(frontFile);
      const frontData = frontResult.cardData;
      
      // Scan back side
      const backResult = await cardAPI.scanCard(backFile);
      const backData = backResult.cardData;
      
      // Combine data from both sides
      // Front side has: civilIdNo, name, nationality, sex, birthDate, expiryDate
      // Back side has: serialNo
      const combinedData = {
        ...frontData,
        serialNo: backData.serialNo || backData.civilIdNo // Use serialNo or civilIdNo from back
      };
      
      // Set the combined scanned data
      setScannedData(combinedData);
      setIsScanning(false);
      setLoading(false);
    } catch (err: any) {
      setError('Failed to scan card: ' + (err.message || 'Unknown error'));
      setIsScanning(false);
      setLoading(false);
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file, side);
    }
  };

  const triggerFileSelect = (side: 'front' | 'back') => {
    setCurrentSide(side);
    // Store the side in a ref to access it in the onChange handler
    if (fileInputRef.current) {
      (fileInputRef.current as any).side = side;
      fileInputRef.current.click();
    }
  };

  const startCamera = (side: 'front' | 'back') => {
    setCurrentSide(side);
    setIsCameraActive(true);
  };

  const captureImage = () => {
    if (webcamRef.current && currentSide) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        // Convert data URL to Blob
        fetch(imageSrc)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], `captured-image-${currentSide}.jpg`, { type: 'image/jpeg' });
            if (currentSide === 'front') {
              setFrontCardImage(imageSrc);
              setFrontCardFile(file);
            } else {
              setBackCardImage(imageSrc);
              setBackCardFile(file);
            }
            
            // Check if both sides are available to scan
            setTimeout(() => {
              // Get current values directly from state setters
              const hasFront = currentSide === 'front' ? true : !!frontCardFile;
              const hasBack = currentSide === 'back' ? true : !!backCardFile;
              
              if (hasFront && hasBack) {
                // Both sides are available, run the scan
                scanBothSides(currentSide === 'front' ? file : frontCardFile!, currentSide === 'back' ? file : backCardFile!);
              }
            }, 0);
            
            // Stop camera after capture
            setIsCameraActive(false);
            setCurrentSide(null);
          });
      }
    }
  };

  const stopCamera = () => {
    setIsCameraActive(false);
    setCurrentSide(null);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={onBack}
            className="w-12 h-12 bg-slate-600 hover:bg-slate-500 rounded-full flex items-center justify-center text-white transition-colors mr-4"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-4xl font-bold text-white">Card Scanning</h1>
        </div>

        {/* Card Scanning Section */}
        <div className="bg-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Scan Civil ID Card</h2>
              <p className="text-gray-600">Upload or capture images of both sides of your Civil ID card for automatic data extraction</p>
            </div>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
                <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Front Side Section */}
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="font-medium text-gray-700 mb-4 flex items-center text-lg">
                  <Camera className="mr-2 h-5 w-5" />
                  Front Side of Civil ID Card
                </h3>
                
                <div className="space-y-4">
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                    {isCameraActive && currentSide === 'front' ? (
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "user" }}
                        className="w-full h-full object-cover"
                      />
                    ) : frontCardImage ? (
                      <img 
                        src={frontCardImage} 
                        alt="Front side of Civil ID card" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <Camera className="mx-auto h-12 w-12 mb-2" />
                        <p>Front side image will appear here</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    {isCameraActive && currentSide === 'front' ? (
                      <>
                        <button
                          onClick={captureImage}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg flex items-center justify-center font-medium"
                        >
                          <Scan className="mr-2 h-4 w-4" />
                          Capture Front Side
                        </button>
                        <button
                          onClick={stopCamera}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg flex items-center justify-center font-medium"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startCamera('front')}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg flex items-center justify-center font-medium"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Start Camera
                        </button>
                        <button
                          onClick={() => triggerFileSelect('front')}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg flex items-center justify-center font-medium"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Front
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Back Side Section */}
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="font-medium text-gray-700 mb-4 flex items-center text-lg">
                  <Camera className="mr-2 h-5 w-5" />
                  Back Side of Civil ID Card
                </h3>
                
                <div className="space-y-4">
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                    {isCameraActive && currentSide === 'back' ? (
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "user" }}
                        className="w-full h-full object-cover"
                      />
                    ) : backCardImage ? (
                      <img 
                        src={backCardImage} 
                        alt="Back side of Civil ID card" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <Camera className="mx-auto h-12 w-12 mb-2" />
                        <p>Back side image will appear here</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    {isCameraActive && currentSide === 'back' ? (
                      <>
                        <button
                          onClick={captureImage}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg flex items-center justify-center font-medium"
                        >
                          <Scan className="mr-2 h-4 w-4" />
                          Capture Back Side
                        </button>
                        <button
                          onClick={stopCamera}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg flex items-center justify-center font-medium"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startCamera('back')}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg flex items-center justify-center font-medium"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Start Camera
                        </button>
                        <button
                          onClick={() => triggerFileSelect('back')}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg flex items-center justify-center font-medium"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Back
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Scanning Indicator */}
            {isScanning && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-700 font-medium">Scanning card with AIVA Document Intelligence...</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Scanned Data Form */}
        {scannedData && (
          <div className="bg-white rounded-2xl p-8 mb-8 shadow-xl">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <Scan className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Scanned Card Data</h2>
                <p className="text-gray-600">Review and edit the extracted information</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Front Side Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Civil ID No</label>
                <input
                  type="text"
                  value={scannedData.civilIdNo || ''}
                  onChange={(e) => setScannedData({...scannedData, civilIdNo: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={scannedData.name || ''}
                  onChange={(e) => setScannedData({...scannedData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
                <input
                  type="text"
                  value={scannedData.nationality || ''}
                  onChange={(e) => setScannedData({...scannedData, nationality: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sex</label>
                <input
                  type="text"
                  value={scannedData.sex || ''}
                  onChange={(e) => setScannedData({...scannedData, sex: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Birth Date</label>
                <input
                  type="date"
                  value={scannedData.birthDate || ''}
                  onChange={(e) => setScannedData({...scannedData, birthDate: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                <input
                  type="date"
                  value={scannedData.expiryDate || ''}
                  onChange={(e) => setScannedData({...scannedData, expiryDate: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
              {/* Back Side Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Serial No</label>
                <input
                  type="text"
                  value={scannedData.serialNo || ''}
                  onChange={(e) => setScannedData({...scannedData, serialNo: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    <input
                      type="text"
                      value={value as string || ''}
                      onChange={(e) => setScannedData({...scannedData, [key]: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 flex space-x-3">
              <button
                onClick={() => setScannedData(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 rounded-lg font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        )}
        
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const side = (e.target as any).side as 'front' | 'back';
            handleFileChange(e, side || 'front');
          }}
        />
      </div>
    </div>
  );
};

export default CardScanning;