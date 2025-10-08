import React, { useState, useEffect } from 'react';
import { X, Upload, File, Trash2, Download } from 'lucide-react';
import { workspaceAPI } from '../../utils/api'; // Changed from adminAPI to workspaceAPI

interface WorkspaceFile {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

interface WorkspaceFileManagerProps {
  workspaceId: string;
  workspaceName: string;
  onClose: () => void;
}

const WorkspaceFileManager: React.FC<WorkspaceFileManagerProps> = ({ 
  workspaceId, 
  workspaceName,
  onClose 
}) => {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [indexing, setIndexing] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [workspaceId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const data = await workspaceAPI.getWorkspaceFiles(workspaceId); // Changed from adminAPI to workspaceAPI
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to load workspace files:', error);
      alert('Failed to load workspace files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }
    
    try {
      setUploading(true);
      console.log('Uploading file to workspace:', workspaceId, selectedFile.name);
      const result = await workspaceAPI.uploadFileToWorkspace(workspaceId, selectedFile); // Changed from adminAPI to workspaceAPI
      console.log('Upload result:', result);
      setSelectedFile(null);
      await loadFiles(); // Refresh the file list
      alert('File uploaded successfully!');
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      const errorMessage = error.details?.message || error.message || 'Failed to upload file. Please try again.';
      alert(`Upload failed: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        await workspaceAPI.deleteWorkspaceFile(workspaceId, fileId); // Changed from adminAPI to workspaceAPI
        await loadFiles(); // Refresh the file list
        alert('File deleted successfully!');
      } catch (error: any) {
        console.error('Failed to delete file:', error);
        const errorMessage = error.details?.message || error.message || 'Failed to delete file. Please try again.';
        alert(`Delete failed: ${errorMessage}`);
      }
    }
  };

  // Function to trigger workspace indexing
  const triggerIndexing = async () => {
    try {
      setIndexing(true);
      console.log('Triggering workspace indexing for:', workspaceId);
      const result = await workspaceAPI.triggerWorkspaceIndexing(workspaceId);
      console.log('Indexing trigger result:', result);
    } catch (error: any) {
      console.error('Failed to trigger workspace indexing:', error);
      const errorMessage = error.details?.message || error.message || 'Failed to trigger workspace indexing. Please try again.';
      console.error(`Indexing trigger failed: ${errorMessage}`);
    } finally {
      setIndexing(false);
    }
  };

  // Handle close with automatic indexing
  const handleClose = async () => {
    // Trigger indexing before closing
    await triggerIndexing();
    onClose();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Files - {workspaceName}
          </h3>
          <button
            onClick={handleClose}
            disabled={indexing}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            {indexing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            ) : (
              <X className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>

        {/* File Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex-1">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className={`flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium cursor-pointer ${
                  uploading 
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Upload className="w-4 h-4 mr-2" />
                {selectedFile ? selectedFile.name : 'Choose a file'}
              </label>
            </div>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                !selectedFile || uploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Supported file types: PDF, DOC, DOCX, TXT, JPG, PNG. Max file size: 10MB
          </p>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <File className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No files uploaded</h3>
              <p className="text-gray-500">Upload your first file to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <File className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{file.originalName}</div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            onClick={handleClose}
            disabled={indexing}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors flex items-center"
          >
            {indexing && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            {indexing ? 'Indexing...' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceFileManager;