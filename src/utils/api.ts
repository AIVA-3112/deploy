// API utility functions for frontend components

// Use relative paths for proxying in development, absolute URL for production
const API_BASE_URL = '/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Generic API request function
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
    if (!response.ok) {
      let errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      try {
        errorData = await response.json();
      } catch (e) {
        // ignore JSON parse error
      }
      console.error('API Error:', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      (error as any).details = errorData;
      throw error;
    }
    return response.json();
  } catch (err) {
    console.error('API Request Failed:', endpoint, err);
    throw err;
  }
};

// Bookmark API functions
export const bookmarkAPI = {
  async getBookmarks() {
    return apiRequest('/bookmarks');
  },
  
  async addBookmark(messageId: string) {
    return apiRequest(`/bookmarks/${messageId}`, {
      method: 'POST',
    });
  },
  
  async removeBookmark(messageId: string) {
    return apiRequest(`/bookmarks/${messageId}`, {
      method: 'DELETE',
    });
  },
};

// Message Actions API functions
export const messageActionAPI = {
  async getLikedMessages() {
    return apiRequest('/message-actions/liked');
  },
  
  async getDislikedMessages() {
    return apiRequest('/message-actions/disliked');
  },
  
  async addMessageAction(messageId: string, actionType: 'like' | 'dislike' | 'star' | 'bookmark') {
    return apiRequest(`/message-actions/${messageId}/${actionType}`, {
      method: 'POST',
    });
  },
  
  async removeMessageAction(messageId: string, actionType: 'like' | 'dislike' | 'star' | 'bookmark') {
    return apiRequest(`/message-actions/${messageId}/${actionType}`, {
      method: 'DELETE',
    });
  },
};

// Workspace API functions
export const workspaceAPI = {
  async getWorkspaces() {
    return apiRequest('/workspaces');
  },
  
  async createWorkspace(data: {
    name: string;
    description?: string;
    color?: string;
    isShared?: boolean;
  }) {
    return apiRequest('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async updateWorkspace(workspaceId: string, data: Partial<{
    name: string;
    description: string;
    color: string;
    isShared: boolean;
  }>) {
    return apiRequest(`/workspaces/${workspaceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  async deleteWorkspace(workspaceId: string) {
    return apiRequest(`/workspaces/${workspaceId}`, {
      method: 'DELETE',
    });
  },
  
  // Workspace file management
  async uploadFileToWorkspace(workspaceId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/upload`, {
        method: 'POST',
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {},
        body: formData,
      });
      
      if (!response.ok) {
        let errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        try {
          errorData = await response.json();
        } catch (e) {
          // ignore JSON parse error
        }
        console.error('File Upload Error:', {
          endpoint: `/workspaces/${workspaceId}/upload`,
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).details = errorData;
        throw error;
      }
      
      return response.json();
    } catch (err) {
      console.error('File Upload Request Failed:', `/workspaces/${workspaceId}/upload`, err);
      throw err;
    }
  },
  
  async triggerWorkspaceIndexing(workspaceId: string) {
    return apiRequest(`/workspaces/${workspaceId}/index`, {
      method: 'POST',
    });
  },
  
  async getWorkspaceFiles(workspaceId: string) {
    return apiRequest(`/workspaces/${workspaceId}/files`);
  },
  
  async deleteWorkspaceFile(workspaceId: string, fileId: string) {
    return apiRequest(`/workspaces/${workspaceId}/files/${fileId}`, {
      method: 'DELETE',
    });
  }
};

// Chat API functions
export const chatAPI = {
  async sendMessage(data: {
    message: string;
    chatId?: string;
    parentMessageId?: string;
    datasetId?: string;
    workspaceId?: string;
    useDataAgent?: boolean;
    files?: Array<{id: string, originalName: string, url: string, mimeType: string}>;
  }) {
    // Ensure we have a workspaceId, use default if not provided
    if (!data.workspaceId) {
      // We'll handle default workspace on the backend
      delete data.workspaceId;
    }
    
    try {
      return await apiRequest('/chat/message', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Rethrow with a user-friendly message
      if (error instanceof Error) {
        // If the error already has a user-friendly message from the backend, use it
        throw error;
      } else {
        throw new Error('Failed to send message. Please try again.');
      }
    }
  },
  
  async getChats(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    
    const endpoint = searchParams.toString() ? `/chat?${searchParams}` : '/chat';
    return apiRequest(endpoint);
  },
  
  async createChat(data: {
    title: string;
    description?: string;
    workspaceId?: string;
  }) {
    // Ensure we have a workspaceId, use default if not provided
    if (!data.workspaceId) {
      // We'll handle default workspace on the backend
      delete data.workspaceId;
    }
    
    return apiRequest('/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async getChatMessages(chatId: string, params?: {
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    
    const endpoint = searchParams.toString() ? `/chat/${chatId}/messages?${searchParams}` : `/chat/${chatId}/messages`;
    return apiRequest(endpoint);
  },
  
  async deleteChat(chatId: string) {
    return apiRequest(`/chat/${chatId}`, {
      method: 'DELETE',
    });
  },
};

// Chat History API functions
export const historyAPI = {
  async getChatHistory(limit?: number) {
    const endpoint = limit ? `/history?limit=${limit}` : '/history';
    return apiRequest(endpoint);
  },
  
  async getChatDetails(chatId: string) {
    return apiRequest(`/history/${chatId}`);
  },
};

// Feedback API functions
export const feedbackAPI = {
  async submitFeedback(feedbackData: {
    subject: string;
    message: string;
    category: string;
    priority: string;
  }) {
    return apiRequest('/feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  },
  
  async getUserFeedback() {
    return apiRequest('/feedback/my-feedback');
  },
};

// User API functions
export const userAPI = {
  async getProfile() {
    return apiRequest('/user/profile');
  },
  
  async updateProfile(profileData: any) {
    return apiRequest('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },
  
  async getStats() {
    return apiRequest('/user/stats');
  },
};

// File API functions
export const fileAPI = {
  async uploadFile(file: File, chatId?: string, messageId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (chatId) {
      formData.append('chatId', chatId);
    }
    if (messageId) {
      formData.append('messageId', messageId);
    }
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) {
        let errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        try {
          errorData = await response.json();
        } catch (e) {
          // ignore JSON parse error
        }
        console.error('File Upload Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).details = errorData;
        throw error;
      }
      return response.json();
    } catch (err) {
      console.error('File Upload Request Failed:', err);
      throw err;
    }
  },
  
  async getFiles() {
    return apiRequest('/files');
  },
  
  async deleteFile(fileId: string) {
    return apiRequest(`/files/${fileId}`, {
      method: 'DELETE',
    });
  },
  
  async downloadFile(fileId: string) {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/files/download/${fileId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
      const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }
    
    return response;
  },
};

// Auth API functions
export const authAPI = {
  async login(email: string, password: string) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  
  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  async verifyToken() {
    return apiRequest('/auth/verify');
  },
  
  async logout() {
    return apiRequest('/auth/logout', {
      method: 'POST',
    });
  },
};

// Admin API functions
export const adminAPI = {
  // Configuration management
  async getConfig() {
    return apiRequest('/admin/config');
  },
  
  async updateConfigSection(section: string, data: any) {
    return apiRequest(`/admin/config/${section}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  async testConfigSection(section: string) {
    return apiRequest(`/admin/config/${section}/test`, {
      method: 'POST',
    });
  },
  
  async getAzureServices() {
    return apiRequest('/admin/azure-services');
  },
  
  // User management
  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    
    const endpoint = searchParams.toString() ? `/admin/users?${searchParams}` : '/admin/users';
    return apiRequest(endpoint);
  },
  
  async createUser(userData: any) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  async updateUser(userId: string, userData: any) {
    return apiRequest(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
  
  async deleteUser(userId: string) {
    return apiRequest(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },
  
  async bulkDeleteUsers(userIds: string[]) {
    return apiRequest('/admin/users/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  },
  
  // System statistics and monitoring
  async getStats() {
    return apiRequest('/admin/stats');
  },
  
  async getMonitoringData() {
    return apiRequest('/admin/monitoring');
  },
  
  // Disliked messages
  async getDislikedMessages(params?: { page?: number; limit?: number; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    
    const endpoint = searchParams.toString() ? `/admin/disliked-messages?${searchParams}` : '/admin/disliked-messages';
    return apiRequest(endpoint);
  },
  
  // Feedback management
  async getFeedback(params?: { page?: number; limit?: number; search?: string; status?: string; category?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.category) searchParams.set('category', params.category);
    
    const endpoint = searchParams.toString() ? `/admin/feedback?${searchParams}` : '/admin/feedback';
    return apiRequest(endpoint);
  },
  
  async respondToFeedback(feedbackId: string, response: string, status?: string) {
    return apiRequest(`/admin/feedback/${feedbackId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ response, status }),
    });
  },
  
  // Admin data operations
  async askDataQuestion(questionData: any) {
    return apiRequest('/admin/data/question', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });
  },
  
  async executeDataQuery(queryData: any) {
    return apiRequest('/admin/data/query', {
      method: 'POST',
      body: JSON.stringify(queryData),
    });
  },
  
  async getAdminDatasets(workspaceId?: string) {
    const endpoint = workspaceId ? `/admin/data/datasets?workspaceId=${workspaceId}` : '/admin/data/datasets';
    return apiRequest(endpoint);
  },
  
  async getAdminDatasetSchema(datasetId: string, workspaceId?: string) {
    const searchParams = new URLSearchParams();
    if (workspaceId) searchParams.set('workspaceId', workspaceId);
    
    const endpoint = searchParams.toString() ? 
      `/admin/data/datasets/${datasetId}/schema?${searchParams}` : 
      `/admin/data/datasets/${datasetId}/schema`;
    return apiRequest(endpoint);
  },
  
  async analyzeAdminQuestion(question: string) {
    return apiRequest('/admin/data/analyze', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  },
  
  async getAdminConnections() {
    return apiRequest('/admin/data/connections');
  },
  
  async createAdminConnection(connectionData: any) {
    return apiRequest('/admin/data/connections', {
      method: 'POST',
      body: JSON.stringify(connectionData),
    });
  },
  
  async getAdminHealth() {
    return apiRequest('/admin/data/health');
  },
  
  // Key Vault management
  async getKeyVaultStatus() {
    return apiRequest('/admin/keyvault/status');
  },
  
  async getKeyVaultSecrets() {
    return apiRequest('/admin/keyvault/secrets');
  },
  
  async checkSecretExists(secretName: string) {
    return apiRequest(`/admin/keyvault/secrets/${secretName}/exists`);
  },
  
  async addKeyVaultSecret(secretData: { secretName: string; secretValue: string; contentType?: string }) {
    return apiRequest('/admin/keyvault/secrets', {
      method: 'POST',
      body: JSON.stringify(secretData),
    });
  },
  
  async updateKeyVaultSecret(secretName: string, secretData: { secretValue: string; contentType?: string }) {
    return apiRequest(`/admin/keyvault/secrets/${secretName}`, {
      method: 'PUT',
      body: JSON.stringify(secretData),
    });
  },
  
  async deleteKeyVaultSecret(secretName: string) {
    return apiRequest(`/admin/keyvault/secrets/${secretName}`, {
      method: 'DELETE',
    });
  },
  
  async migrateSecretsToKeyVault() {
    return apiRequest('/admin/keyvault/migrate', {
      method: 'POST',
    });
  },
  
  async initializeKeyVault(config: { keyVaultUrl: string; tenantId?: string; clientId?: string; clientSecret?: string }) {
    return apiRequest('/admin/keyvault/initialize', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },
  
  // Workspace management
  async getWorkspaces(params?: { page?: number; limit?: number; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    
    const endpoint = searchParams.toString() ? `/workspaces?${searchParams}` : '/workspaces';
    return apiRequest(endpoint);
  },
  
  async createWorkspace(workspaceData: { name: string; description?: string; color?: string; isShared?: boolean }) {
    return apiRequest('/workspaces', {
      method: 'POST',
      body: JSON.stringify(workspaceData),
    });
  },
  
  async updateWorkspace(workspaceId: string, workspaceData: { name?: string; description?: string; color?: string; isShared?: boolean }) {
    return apiRequest(`/workspaces/${workspaceId}`, {
      method: 'PUT',
      body: JSON.stringify(workspaceData),
    });
  },
  
  async deleteWorkspace(workspaceId: string) {
    return apiRequest(`/workspaces/${workspaceId}`, {
      method: 'DELETE',
    });
  },
  
  async getWorkspaceDetails(workspaceId: string) {
    return apiRequest(`/workspaces/${workspaceId}`);
  },
  
  async getAvailableUsersForWorkspace(workspaceId: string, search?: string) {
    const searchParams = new URLSearchParams();
    if (search) searchParams.set('search', search);
    
    const endpoint = searchParams.toString() ? 
      `/workspaces/${workspaceId}/available-users?${searchParams}` : 
      `/workspaces/${workspaceId}/available-users`;
    return apiRequest(endpoint);
  },
  
  async assignUsersToWorkspace(workspaceId: string, userIds: string[], accessLevel?: string) {
    return apiRequest(`/workspaces/${workspaceId}/assign-user`, {
      method: 'POST',
      body: JSON.stringify({ userIds, accessLevel }),
    });
  },
  
  async removeUsersFromWorkspace(workspaceId: string, userIds: string[]) {
    return apiRequest(`/workspaces/${workspaceId}/remove-user`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  },
  
  async updateUserAccessInWorkspace(workspaceId: string, userId: string, accessLevel: string) {
    return apiRequest(`/workspaces/${workspaceId}/user-access`, {
      method: 'PUT',
      body: JSON.stringify({ userId, accessLevel }),
    });
  }
};

// Card API functions
export const cardAPI = {
  async scanCard(file: File) {
    const formData = new FormData();
    formData.append('cardImage', file);
    
    const token = localStorage.getItem('authToken');
    try {
      // Use the admin endpoint for card scanning
      const response = await fetch(`/api/admin/cards/scan`, {
        method: 'POST',
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {},
        body: formData,
      });
      
      if (!response.ok) {
        let errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        try {
          errorData = await response.json();
        } catch (e) {
          // ignore JSON parse error
        }
        console.error('Card Scan Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).details = errorData;
        throw error;
      }
      
      return response.json();
    } catch (err) {
      console.error('Card Scan Request Failed:', err);
      throw err;
    }
  },
  
  async getCards() {
    return apiRequest('/admin/cards');
  },
  
  async deleteCard(cardId: string) {
    return apiRequest(`/admin/cards/${cardId}`, {
      method: 'DELETE',
    });
  },
};

// Helper function for FormData requests
function getAuthHeadersWithoutContentType() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}
