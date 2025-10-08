import React, { useState, useRef, useEffect } from 'react';
import { bookmarkAPI, messageActionAPI, historyAPI, chatAPI, workspaceAPI, fileAPI } from '../utils/api';
import { Message, User, Workspace, BookmarkedMessage, LikedMessage, DislikedMessage, ChatHistory } from '../utils/types';
import { generateAvatar } from '../utils/avatar';
import {
  Menu,
  Building2,
  Bookmark,
  User as UserIcon,
  Heart,
  HeartOff,
  History,
  HelpCircle,
  Plus,
  X,
  Mail,
  Copy,
  Download,
  Mic,
  ThumbsUp,
  ThumbsDown,
  Star,
  Share2,
  Image as ImageIcon,
  Paperclip,
  Send,
  MessageSquare,
  Folder,
  AlertCircle,
  Clock,
  UserPlus,
  RefreshCw,
  Users,
  LogOut,
  File as FileIcon,
  CreditCard,
  Scan
} from 'lucide-react';
import SimpleMarkdown from '../components/SimpleMarkdown';
import AboutAIVA from '../components/AboutAIVA';
import BookmarksPage from '../components/BookmarksPage';
import LikedMessagesPage from '../components/LikedMessagesPage';
import DislikedMessagesPage from '../components/DislikedMessagesPage';
import HistoryPage from '../components/HistoryPage';
import WorkspacesPage from '../components/WorkspacesPage';
import FeedbackPage from '../components/FeedbackPage';

import CardScanning from '../components/CardScanning';

interface DashboardProps {
  onLogout: () => void;
  onSwitchAccount: () => void;
  onNavigateToHome: () => void;
  user: User | null;
  onNavigateHome: (user: User) => void;
  onNavigateToDashboard: () => void;
}

interface WorkspaceFile {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

interface PendingFile {
  id: string;
  file: File;
  type: 'image' | 'file' | 'document' | 'workspace';
  previewUrl?: string;
  workspaceFile?: WorkspaceFile; // Add this property for workspace files
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, onSwitchAccount,onNavigateToHome, user,onNavigateToDashboard}) => {
  const [currentView, setCurrentView] = useState<'chat' | 'about' | 'bookmarks' | 'liked' | 'disliked' | 'history' | 'workspaces' | 'feedback' | 'cardscan'>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [dataMode, setDataMode] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [bookmarkedMessages, setBookmarkedMessages] = useState<BookmarkedMessage[]>([]);
  const [likedMessages, setLikedMessages] = useState<LikedMessage[]>([]);
  const [dislikedMessages, setDislikedMessages] = useState<DislikedMessage[]>([]);
  const [messageActions, setMessageActions] = useState<Record<string, { liked: boolean; disliked: boolean; starred: boolean; bookmarked: boolean }>>({});
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copyingMessageId, setCopyingMessageId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharingMessage, setSharingMessage] = useState<{ id: string; text: string } | null>(null);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadingMessage, setDownloadingMessage] = useState<{ id: string; text: string } | null>(null);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [workspaceFilesModalOpen, setWorkspaceFilesModalOpen] = useState(false);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [loadingWorkspaceFiles, setLoadingWorkspaceFiles] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'SpeechRecognition' in window) {
      const recognitionInstance = new (window as any).SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
      };

      recognitionInstance.onerror = () => {
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  // Load initial data when component mounts
  useEffect(() => {
    // Load chat history and user data from database
    loadChatHistory();
    loadBookmarks();
    loadLikedMessages();
    loadDislikedMessages();
    initializeWorkspaces(); // Initialize workspaces
  }, []);

  // Functions to load data from database
  const loadChatHistory = async () => {
    try {
      const response = await historyAPI.getChatHistory(50);
      setChatHistory(response.chatHistory || []);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const loadBookmarks = async () => {
    try {
      const response = await bookmarkAPI.getBookmarks();
      setBookmarkedMessages(response.bookmarks || []);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const loadLikedMessages = async () => {
    try {
      const response = await messageActionAPI.getLikedMessages();
      setLikedMessages(response.messages || []);
    } catch (error) {
      console.error('Error loading liked messages:', error);
    }
  };

  const loadDislikedMessages = async () => {
    try {
      const response = await messageActionAPI.getDislikedMessages();
      setDislikedMessages(response.messages || []);
    } catch (error) {
      console.error('Error loading disliked messages:', error);
    }
  };

  const handleDownloadMessage = (messageId: string, messageText: string) => {
    setDownloadingMessage({ id: messageId, text: messageText });
    setDownloadModalOpen(true);
  };

  const handleDownloadFormat = (format: 'pdf' | 'word') => {
    if (!downloadingMessage) return;
    
    const { text: messageText } = downloadingMessage;
    const timestamp = new Date().toLocaleString();
    const filename = `AIVA_Message_${Date.now()}`;
    
    setDownloadModalOpen(false);
    setDownloadingMessage(null);
    
    // Simple text download as fallback
    const content = `AIVA Message

Downloaded on: ${timestamp}

${messageText}

Generated by AIVA Chat System`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareMessage = (messageId: string, messageText: string) => {
    setSharingMessage({ id: messageId, text: messageText });
    setShareModalOpen(true);
  };

  const handleShareViaTeams = () => {
    if (!sharingMessage) return;
    
    const { text: messageText } = sharingMessage;
    const timestamp = new Date().toLocaleString();
    
    // Create Teams sharing URL with pre-filled message
    const teamsMessage = `AIVA Chat Response (${timestamp}):

${messageText}

---
Shared from AIVA Chat System`;
    const teamsUrl = `https://teams.microsoft.com/l/chat/0/0?users=&topicName=AIVA%20Chat%20Response&message=${encodeURIComponent(teamsMessage)}`;
    
    // Open Teams in new window
    window.open(teamsUrl, '_blank', 'width=800,height=600');
    
    setShareModalOpen(false);
    setSharingMessage(null);
  };

  const handleShareViaOutlook = () => {
    if (!sharingMessage) return;
    
    const { text: messageText } = sharingMessage;
    const timestamp = new Date().toLocaleString();
    
    // Create Outlook email with pre-filled content
    const subject = `AIVA Chat Response - ${timestamp}`;
    const body = `Hi,

I wanted to share this response from AIVA:

---

${messageText}

---

Generated on: ${timestamp}
Shared from AIVA Chat System

Best regards`;
    
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open Outlook in new window
    window.open(outlookUrl, '_blank', 'width=800,height=600');
    
    setShareModalOpen(false);
    setSharingMessage(null);
  };

  const handleCopyForSharing = async () => {
    if (!sharingMessage) return;
    
    const { text: messageText } = sharingMessage;
    const timestamp = new Date().toLocaleString();
    const shareText = `AIVA Chat Response (${timestamp}):

${messageText}

---
Shared from AIVA Chat System`;
    
    try {
      await navigator.clipboard.writeText(shareText);
      alert('Response copied to clipboard! You can now paste it anywhere.');
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Response copied to clipboard! You can now paste it anywhere.');
    }
    
    setShareModalOpen(false);
    setSharingMessage(null);
  };

  // Function to load workspace files
  const loadWorkspaceFiles = async () => {
    if (!currentWorkspaceId) return;
    
    try {
      setLoadingWorkspaceFiles(true);
      const response = await workspaceAPI.getWorkspaceFiles(currentWorkspaceId);
      setWorkspaceFiles(response.files || []);
    } catch (error) {
      console.error('Error loading workspace files:', error);
      setWorkspaceFiles([]);
    } finally {
      setLoadingWorkspaceFiles(false);
    }
  };

  // Function to initialize workspaces
  const initializeWorkspaces = async () => {
    try {
      const response = await workspaceAPI.getWorkspaces();
      if (response.workspaces && response.workspaces.length > 0) {
        setWorkspaces(response.workspaces);
        // Don't automatically select a workspace, let user choose
        setCurrentWorkspaceId(null);
      } else {
        // No workspaces available
        setCurrentWorkspaceId(null);
        setWorkspaces([]);
      }
    } catch (error) {
      console.error('Error initializing workspaces:', error);
      setCurrentWorkspaceId(null);
      setWorkspaces([]);
    }
  };

  // Function to handle attaching a workspace file
  const handleAttachWorkspaceFile = (file: WorkspaceFile) => {
    // Add the workspace file to pending files with a special type
    const pendingFile: PendingFile = {
      id: `workspace-${file.id}`,
      file: new File([""], file.originalName, { type: file.mimeType }), // Proper file object
      type: 'workspace',
      previewUrl: undefined,
      workspaceFile: file // Store the actual workspace file data
    };
    
    setPendingFiles(prev => [...prev, pendingFile]);
    setWorkspaceFilesModalOpen(false);
  };

  const handleFileAttachment = async (type: 'image' | 'file' | 'document' | 'workspace') => {
    if (type === 'workspace') {
      // Load workspace files and open the modal
      await loadWorkspaceFiles();
      setWorkspaceFilesModalOpen(true);
      setAttachmentModalOpen(false);
      return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    
    switch (type) {
      case 'image':
        input.accept = 'image/*';
        break;
      case 'file':
        input.accept = '*/*';
        break;
      case 'document':
        input.accept = '.pdf,.doc,.docx,.txt,.rtf';
        break;
    }
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Instead of uploading immediately, add to pending files
        const pendingFile: PendingFile = {
          id: `pending-${Date.now()}`,
          file,
          type,
          previewUrl: type === 'image' ? URL.createObjectURL(file) : undefined
        };
        
        setPendingFiles(prev => [...prev, pendingFile]);
      }
    };
    
    input.click();
    setAttachmentModalOpen(false);
  };

  // Function to handle new chat creation
  const handleNewChat = async () => {
    try {
      // Create new chat in database
      const requestData: any = {
        title: 'New Chat',
        description: 'Auto-generated chat'
      };
      
      // Add workspaceId if available
      if (currentWorkspaceId) {
        requestData.workspaceId = currentWorkspaceId;
      }
      
      const response = await chatAPI.createChat(requestData);
      
      const newChatId = response.chat.id;
      setCurrentChatId(newChatId);
      
      // Reset messages to initial state
      setMessages([
        {
          id: '1',
          text: `Hey ${user?.name || 'User'}! How can I assist you?`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }
      ]);
      
      // Clear all message actions
      setMessageActions({});
      
      // Clear pending files
      setPendingFiles([]);
      
      // Clear current message input
      setMessage('');
      
      // Stop any ongoing speech synthesis
      if (speakingMessageId) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
      
      // Refresh chat history
      await loadChatHistory();
    } catch (error) {
      console.error('Error creating new chat:', error);
      // Fallback to local ID generation if API fails
      const newChatId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      setCurrentChatId(newChatId);
      
      // Reset messages to initial state
      setMessages([
        {
          id: '1',
          text: `Hey ${user?.name || 'User'}! How can I assist you?`,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }
      ]);
      
      // Clear all message actions
      setMessageActions({});
      
      // Clear pending files
      setPendingFiles([]);
      
      // Clear current message input
      setMessage('');
      
      // Stop any ongoing speech synthesis
      if (speakingMessageId) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
      
      // Refresh chat history
      await loadChatHistory();
    }
  };

  // Function to navigate to a specific message and highlight it
  const navigateToMessage = (messageId: string) => {
    setCurrentView('chat');
    
    // Scroll to the message and highlight it
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('bg-yellow-100', 'border-2', 'border-yellow-400');
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          messageElement.classList.remove('bg-yellow-100', 'border-2', 'border-yellow-400');
        }, 3000);
      }
    }, 100);
  };

  // Function to load a chat from history
  const loadChatFromHistory = async (chatId: string) => {
    try {
      // Get chat details and messages from database
      const response = await historyAPI.getChatDetails(chatId);
      const chatData = response.chat;
      
      if (!chatData) {
        console.error('Chat not found:', chatId);
        return;
      }
      
      // Convert database messages to frontend format
      const convertedMessages = chatData.messages.map((msg: any) => ({
        id: msg.id,
        text: msg.content,
        isUser: msg.role === 'user',
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }));
      
      // Load the chat messages
      setMessages(convertedMessages);
      setCurrentChatId(chatData.id);
      
      // Clear pending files when loading a chat
      setPendingFiles([]);
      
      // Initialize message actions for the loaded chat
      const newMessageActions: {[key: string]: {
        liked: boolean;
        disliked: boolean;
        starred: boolean;
        bookmarked: boolean;
      }} = {};
      
      convertedMessages.forEach(message => {
        newMessageActions[message.id] = {
          liked: false,
          disliked: false,
          starred: false,
          bookmarked: false
        };
      });
      
      setMessageActions(newMessageActions);
      
      // Switch to chat view
      setCurrentView('chat');
      
      // Stop any ongoing speech synthesis
      if (speakingMessageId) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
    } catch (error) {
      console.error('Error loading chat from history:', error);
      // Fallback to the original behavior if API fails
      const chatToLoad = chatHistory.find(chat => chat.id === chatId);
      if (!chatToLoad) return;
      
      // Switch to chat view
      setCurrentView('chat');
      
      // Clear pending files when loading a chat
      setPendingFiles([]);
      
      // Stop any ongoing speech synthesis
      if (speakingMessageId) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
      }
    }
  };

  // Workspace management functions
  const handleSelectWorkspace = (workspaceId: string | null) => {
    setCurrentWorkspaceId(workspaceId);
    setCurrentView('chat');
    // You could filter chats by workspace here
  };

  const handleVoiceInput = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() && pendingFiles.length === 0) return;
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Add user message to UI immediately for better UX
    // Show only the user's message and simple file attachment info
    let userMessageText = messageText.trim();
    if (pendingFiles.length > 0) {
      const fileText = `📎 ${pendingFiles.length} file(s) attached`;
      userMessageText = userMessageText ? `${userMessageText}\n\n${fileText}` : fileText;
    }
    
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      text: userMessageText,
      isUser: true,
      timestamp: timestamp
    };
    
    setMessages(prev => [...prev, tempUserMessage]);
    
    // Scroll to bottom immediately after user message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // Add a temporary "thinking" message to indicate processing
    const tempAiMessage: Message = {
      id: `temp-ai-${Date.now()}`,
      text: 'Thinking...',
      isUser: false,
      timestamp: timestamp,
      isLoading: true
    };
    
    setMessages(prev => [...prev, tempAiMessage]);
    
    // Scroll to show the thinking indicator
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      // Process pending files if any
      let uploadedFiles: any[] = [];
      const workspaceFiles: WorkspaceFile[] = [];
      
      if (pendingFiles.length > 0) {
        // Separate workspace files from regular files
        const regularFiles = pendingFiles.filter(pf => pf.type !== 'workspace');
        const workspacePendingFiles = pendingFiles.filter(pf => pf.type === 'workspace');
        
        // Upload regular files
        if (regularFiles.length > 0) {
          const uploadPromises = regularFiles.map(async (pendingFile) => {
            const response = await fileAPI.uploadFile(pendingFile.file, currentChatId || undefined);
            return response.file;
          });
          
          uploadedFiles = await Promise.all(uploadPromises);
        }
        
        // Collect workspace files
        workspacePendingFiles.forEach(pf => {
          if (pf.workspaceFile) {
            workspaceFiles.push(pf.workspaceFile);
          }
        });
      }

      // Send message to backend API
      const requestData: any = {
        message: messageText,
        chatId: currentChatId || undefined,
        useDataAgent: dataMode
      };
      
      // Add file information to the request if files were uploaded or attached
      if (uploadedFiles.length > 0 || workspaceFiles.length > 0) {
        requestData.files = [
          ...uploadedFiles.map(file => ({
            id: file.id,
            originalName: file.originalName,
            url: file.url,
            mimeType: file.mimeType,
            fileName: file.fileName
          })),
          ...workspaceFiles.map(file => ({
            id: file.id,
            originalName: file.originalName,
            url: file.url,
            mimeType: file.mimeType,
            fileName: file.fileName
          }))
        ];
      }
      
      // Add workspaceId if available and it's a valid UUID
      if (currentWorkspaceId && currentWorkspaceId.length === 36) {
        requestData.workspaceId = currentWorkspaceId;
      }
      
      const response = await chatAPI.sendMessage(requestData);

      // Update current chat ID if this was a new chat
      if (response.chatId && response.chatId !== currentChatId) {
        setCurrentChatId(response.chatId);
      }

      // Replace temp messages with real messages from server
      setMessages(prev => {
        // Remove both temporary messages
        const withoutTemp = prev.filter(msg => 
          msg.id !== tempUserMessage.id && msg.id !== tempAiMessage.id
        );
        
        // Create real user message - show only the user's original message and simple file info
        let realUserMessageText = messageText || '';
        
        // If there were files attached, show a simple indicator
        if (uploadedFiles.length > 0 || workspaceFiles.length > 0) {
          const fileText = `📎 ${(uploadedFiles.length + workspaceFiles.length)} file(s) attached`;
          realUserMessageText = realUserMessageText ? `${realUserMessageText}\n\n${fileText}` : fileText;
        }

        const realUserMessage: Message = {
          id: response.userMessage.id,
          text: realUserMessageText,
          isUser: true,
          timestamp: new Date(response.userMessage.timestamp).toLocaleTimeString([], 
            { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        // Create AI response message
        const aiResponse: Message = {
          id: response.aiResponse.id,
          text: response.aiResponse.content,
          isUser: false,
          timestamp: new Date(response.aiResponse.timestamp).toLocaleTimeString([], 
            { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        
        return [...withoutTemp, realUserMessage, aiResponse];
      });
      
      // Clear pending files after successful send
      setPendingFiles([]);
      
      // Initialize actions for both messages
      setMessageActions(prev => ({
        ...prev,
        [response.userMessage.id]: {
          liked: false,
          disliked: false,
          starred: false,
          bookmarked: false
        },
        [response.aiResponse.id]: {
          liked: false,
          disliked: false,
          starred: false,
          bookmarked: false
        }
      }));
      
      // Scroll to bottom after AI response
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Refresh chat history to include the updated chat
      await loadChatHistory();
      
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Remove both temporary messages on error
      setMessages(prev => prev.filter(msg => 
        msg.id !== tempUserMessage.id && msg.id !== tempAiMessage.id
      ));
      
      // Clear pending files on error
      setPendingFiles([]);
      
      // Get a user-friendly error message
      let responseText = 'Sorry, there was an error processing your message. Please try again.';
      
      // Check for specific error types from the backend
      if (error.message) {
        if (error.message.includes('timeout') || error.message.includes('timed out')) {
          responseText = 'The AI service is taking too long to respond. Please try again later.';
        } else if (error.message.includes('overloaded') || error.message.includes('rate limit')) {
          responseText = 'The AI service is currently overloaded. Please wait a moment and try again.';
        } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
          responseText = 'Authentication failed. Please refresh the page and try again.';
        } else if (error.message.includes('model') || error.message.includes('configuration')) {
          responseText = 'There is an issue with the AI model configuration. Please contact support.';
        } else if (error.message.includes('workspace')) {
          responseText = 'Workspace configuration error. Please refresh the page and try again.';
        } else {
          // Use the error message from the backend if available
          responseText = error.message;
        }
      }
      
      // Create error message with unique ID
      const errorId = `error-${Date.now()}`;
      const errorMessage: Message = {
        id: errorId,
        text: responseText,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isError: true
      };
      
      // Add error message to chat
      setMessages(prev => [...prev, errorMessage]);
      
      // Initialize actions for error message
      setMessageActions(prev => ({
        ...prev,
        [errorId]: {
          liked: false,
          disliked: false,
          starred: false,
          bookmarked: false
        }
      }));
      
      // Scroll to show the error
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(message);
    setMessage('');
  };

  const removePendingFile = (fileId: string) => {
    setPendingFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleMessageAction = async (messageId: string, action: 'liked' | 'disliked' | 'starred' | 'bookmarked') => {
    // Skip action handling for temporary or error messages
    if (messageId.startsWith('temp-') || messageId.startsWith('error-')) {
      console.warn('Cannot perform actions on temporary or error messages');
      return;
    }
    
    const message = messages.find(msg => msg.id === messageId);
    if (!message || message.isUser) return;

    // Get the current state before making changes
    const isCurrentlyActive = messageActions[messageId]?.[action] || false;

    try {
      // Map frontend action names to backend action names
      const actionMap: Record<string, string> = {
        'liked': 'like',
        'disliked': 'dislike',
        'starred': 'star',
        'bookmarked': 'bookmark'
      };
      
      const backendAction = actionMap[action] as 'like' | 'dislike' | 'star' | 'bookmark';
      
      if (isCurrentlyActive) {
        // Remove the action
        await messageActionAPI.removeMessageAction(messageId, backendAction);
        
        // Update local state
        if (action === 'bookmarked') {
          setBookmarkedMessages(prev => prev.filter(bookmark => bookmark.id !== messageId));
        } else if (action === 'liked') {
          setLikedMessages(prev => prev.filter(liked => liked.id !== messageId));
        } else if (action === 'disliked') {
          setDislikedMessages(prev => prev.filter(disliked => disliked.id !== messageId));
        }
      } else {
        // Add the action
        await messageActionAPI.addMessageAction(messageId, backendAction);
        
        // Update local state
        if (action === 'bookmarked') {
          const newBookmark = {
            id: messageId,
            title: `AI Response - ${message.timestamp}`,
            description: message.text.length > 100 ? message.text.substring(0, 100) + '...' : message.text,
            date: new Date().toISOString().split('T')[0],
            type: 'Conversation',
            category: 'Conversation' as const
          };
          setBookmarkedMessages(prev => [newBookmark, ...prev]);
        } else if (action === 'liked') {
          const newLikedMessage = {
            id: messageId,
            title: `AI Response - ${message.timestamp}`,
            description: message.text.length > 100 ? message.text.substring(0, 100) + '...' : message.text,
            date: new Date().toISOString().split('T')[0],
            type: 'Conversation',
            category: 'Conversation' as const
          };
          setLikedMessages(prev => [newLikedMessage, ...prev]);
        } else if (action === 'disliked') {
          const newDislikedMessage = {
            id: messageId,
            title: `AI Response - ${message.timestamp}`,
            description: message.text.length > 100 ? message.text.substring(0, 100) + '...' : message.text,
            date: new Date().toISOString().split('T')[0],
            type: 'Conversation',
            category: 'Conversation' as const
          };
          setDislikedMessages(prev => [newDislikedMessage, ...prev]);
        }
      }

      // Update message actions state
      setMessageActions(prev => ({
        ...prev,
        [messageId]: {
          ...prev[messageId] || { liked: false, disliked: false, starred: false, bookmarked: false },
          [action]: !isCurrentlyActive,
          // If liking, remove dislike and vice versa
          ...(action === 'liked' && (prev[messageId]?.disliked || false) ? { disliked: false } : {}),
          ...(action === 'disliked' && (prev[messageId]?.liked || false) ? { liked: false } : {})
        }
      }));
    } catch (error) {
      console.error(`Error ${isCurrentlyActive ? 'removing' : 'adding'} ${action}:`, error);
      // Show user-friendly error message
      alert(`Failed to ${isCurrentlyActive ? 'remove' : 'add'} ${action}. Please try again.`);
    }
  };

  const handleSpeakMessage = (messageId: string, text: string) => {
    // Stop any currently speaking message
    if (speakingMessageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser');
      return;
    }

    // Create speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure speech settings
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;
    
    // Set up event listeners
    utterance.onstart = () => {
      setSpeakingMessageId(messageId);
    };
    
    utterance.onend = () => {
      setSpeakingMessageId(null);
    };
    
    utterance.onerror = () => {
      setSpeakingMessageId(null);
      alert('Speech synthesis failed. Please try again or check if your browser supports text-to-speech.');
    };
    
    // Start speaking
    window.speechSynthesis.speak(utterance);
  };
  

  const handleCopyMessage = async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyingMessageId(messageId);
      // Remove the blink effect after animation completes
      setTimeout(() => {
        setCopyingMessageId(null);
      }, 300);
    } catch (error) {
      console.error('Failed to copy message:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopyingMessageId(messageId);
      setTimeout(() => {
        setCopyingMessageId(null);
      }, 300);
    }
  };

  return (
    <>

      {currentView === 'about' && (
        <AboutAIVA onBack={() => setCurrentView('chat')} />
      )}
      
      {currentView === 'bookmarks' && (
        <BookmarksPage 
          onBack={() => setCurrentView('chat')} 
          bookmarkedMessages={bookmarkedMessages}
          onNavigateToMessage={navigateToMessage}
        />
      )}
      
      {currentView === 'liked' && (
        <LikedMessagesPage 
          onBack={() => setCurrentView('chat')} 
          likedMessages={likedMessages}
          onNavigateToMessage={navigateToMessage}
        />
      )}
      
      {currentView === 'disliked' && (
        <DislikedMessagesPage 
          onBack={() => setCurrentView('chat')} 
          dislikedMessages={dislikedMessages}
          onNavigateToMessage={navigateToMessage}
        />
      )}
      
      {currentView === 'history' && (
        <HistoryPage 
          onBack={() => setCurrentView('chat')} 
          chatHistory={chatHistory}
          onLoadChat={loadChatFromHistory}
          onNavigateToMessage={navigateToMessage}
        />
      )}
      
      {currentView === 'workspaces' && (
        <WorkspacesPage 
          onBack={() => setCurrentView('chat')} 
          workspaces={workspaces}
          onSelectWorkspace={handleSelectWorkspace}
        />
      )}
      
      {currentView === 'feedback' && (
        <FeedbackPage 
          user={user} 
          onNavigateToDashboard={() => setCurrentView('chat')}
        />
      )}
      

      
      {currentView === 'cardscan' && (
        <CardScanning 
          onBack={() => setCurrentView('chat')} 
        />
      )}
      
      {currentView === 'chat' && (
      <div className="h-screen bg-slate-100 flex overflow-hidden flex-shrink-0">
      {/* Sidebar */}
      <div className={`bg-slate-800 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'} flex flex-col h-screen fixed left-0 top-0 z-10`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div 
            onClick={() => setCurrentView('about')}
            className="flex items-center space-x-3 p-3 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <Building2 className="w-5 h-5" />
            {sidebarOpen && <span>About AIVA</span>}
          </div>
          
          <div 
            onClick={() => setCurrentView('cardscan')}
            className="flex items-center space-x-3 p-3 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <Scan className="w-5 h-5" />
            {sidebarOpen && <span>Scan Card</span>}
          </div>
          

          
          <div 
            onClick={() => setCurrentView('bookmarks')}
            className="flex items-center space-x-3 p-3 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <Bookmark className="w-5 h-5" />
            {sidebarOpen && <span>Bookmarks</span>}
          </div>
          
          <div 
            onClick={() => setCurrentView('workspaces')}
            className="flex items-center space-x-3 p-3 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <UserIcon className="w-5 h-5" />
            {sidebarOpen && <span>Workspaces</span>}
          </div>
          
          <div 
            onClick={() => setCurrentView('liked')}
            className="flex items-center space-x-3 p-3 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <Heart className="w-5 h-5" />
            {sidebarOpen && <span>Liked messages</span>}
          </div>
          
          <div 
            onClick={() => setCurrentView('disliked')}
            className="flex items-center space-x-3 p-3 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <HeartOff className="w-5 h-5" />
            {sidebarOpen && <span>Disliked messages</span>}
          </div>
          
          <div 
            onClick={() => setCurrentView('history')}
            className="flex items-center space-x-3 p-3 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <History className="w-5 h-5" />
            {sidebarOpen && <span>History</span>}
          </div>
          
          <div
            onClick={() => setCurrentView('feedback')}
            className="flex items-center space-x-3 p-3 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            {sidebarOpen && <span>Feedback</span>}
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              {user?generateAvatar(user.name):'U'}
            </div>
            {sidebarOpen && (
              <div>
                <div className="font-medium">{user?.name || 'Guest User'}</div>
                <div className="text-sm text-slate-400">{user?.email || 'No email'}</div>


              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
<div className={`flex-1 flex flex-col ${sidebarOpen ? 'ml-64' : 'ml-16'} h-screen transition-all duration-300`}>
        {/* Header */}
        <header className="bg-slate-800 text-white p-4 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
          <button className="flex items-center space-x-3" onClick={()=>{user?onNavigateToHome():null}}>
            <img src="/alyasra-logo.png" alt="Alyasra Logo" className="w-8 h-8" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold flex justify-start">AIVA</h1>
              {currentWorkspaceId ? (
                <p className="text-sm text-slate-300">
                  {workspaces.find(w => w.id === currentWorkspaceId)?.name || 'Workspace'}
                </p>
              ) : (
                <p className="text-sm text-slate-300">General Mode</p>
              )}
            </div>
          </button>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleNewChat}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
            
            <button
              onClick={() => setDataMode(!dataMode)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                dataMode 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
              }`}
            >
              <span>{dataMode ? 'Data Mode On' : 'Data Mode Off'}</span>
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center hover:bg-slate-600 transition-colors"
              >
                <UserIcon className="w-5 h-5" />
              </button>
              
              {/* Profile Dropdown Menu with Overlay */}
              {profileMenuOpen && (
                <>
                  {/* Overlay to close dropdown when clicking outside */}
                  <div 
                    className="fixed inset-0 z-[55]" 
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div 
                    className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-[60] border border-gray-200"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onNavigateToHome();
                        setTimeout(() => {
                          onSwitchAccount();
                        }, 100);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center space-x-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onSwitchAccount();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center space-x-3 text-gray-700 hover:bg-green-50 hover:text-green-700"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Switch Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        alert('Collaboration features coming soon! You can share messages using the share button on individual messages.');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center space-x-3 text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                    >
                      <Users className="w-4 h-4" />
                      <span>Collaboration</span>
                    </button>
                    <hr className="my-2 border-gray-200" />
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors flex items-center space-x-3 text-red-600 hover:text-red-700"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>



      {/* Share Message Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Share Response</h3>
              <button
                onClick={() => setShareModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">Choose how you want to share this response:</p>
            
            <div className="space-y-3">
              <button
                onClick={handleShareViaTeams}
                className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-800">Share via Microsoft Teams</div>
                  <div className="text-sm text-gray-500">Open Teams with pre-filled message</div>
                </div>
              </button>
              
              <button
                onClick={handleShareViaOutlook}
                className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-800">Share via Outlook Email</div>
                  <div className="text-sm text-gray-500">Open Outlook with pre-filled email</div>
                </div>
              </button>
              
              <button
                onClick={handleCopyForSharing}
                className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                  <Copy className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-800">Copy to Clipboard</div>
                  <div className="text-sm text-gray-500">Copy formatted text for sharing anywhere</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto scroll-smooth">
            <div className="max-w-4xl mx-auto">
              {messages.map((msg) => (
                <div key={msg.id} id={`message-${msg.id}`} className="mb-6 transition-all duration-300 rounded-lg p-2">
                  <div className={`flex items-start space-x-3 ${msg.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.isUser ? 'bg-blue-600' : msg.isError ? 'bg-red-600' : msg.isLoading ? 'bg-amber-500' : 'bg-slate-600'
                    }`}>
                      {msg.isUser ? (
                        <UserIcon className="w-4 h-4 text-white" />
                      ) : msg.isError ? (
                        <AlertCircle className="w-4 h-4 text-white" />
                      ) : msg.isLoading ? (
                        <Clock className="w-4 h-4 text-white animate-pulse" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className={`rounded-lg p-4 mb-2 ${
                        msg.isUser 
                          ? 'bg-blue-600 text-white ml-12' 
                          : msg.isError
                            ? 'bg-red-100 text-red-800 mr-12 border border-red-300'
                            : msg.isLoading
                              ? 'bg-slate-100 text-slate-600 mr-12 animate-pulse'
                              : 'bg-slate-200 text-slate-800 mr-12'
                      }`}>
                        {msg.isUser || msg.isError || msg.isLoading ? (
                          <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                        ) : (
                          <SimpleMarkdown content={msg.text} />
                        )}
                        
                        {/* File attachments preview for user messages */}
                        {msg.isUser && pendingFiles.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {pendingFiles.map((pendingFile) => (
                              <div key={pendingFile.id} className="relative">
                                {pendingFile.previewUrl ? (
                                  <div className="relative">
                                    <img 
                                      src={pendingFile.previewUrl} 
                                      alt={pendingFile.file.name}
                                      className="w-16 h-16 object-cover rounded border border-gray-300"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs truncate px-1 py-0.5">
                                      {pendingFile.file.name}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center p-2 bg-gray-100 rounded border border-gray-300 w-32">
                                    <FileIcon className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
                                    <span className="text-xs truncate text-gray-700">{pendingFile.file.name}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {/* Message Actions - only for AI messages that aren't errors or loading */}
                      {!msg.isUser && !msg.isError && !msg.isLoading && (
                        <div className={`flex items-center space-x-2 ${msg.isUser ? 'justify-end' : ''}`}>
                          <button 
                            onClick={() => handleCopyMessage(msg.id, msg.text)}
                            className={`p-2 rounded transition-all duration-300 ${
                              copyingMessageId === msg.id
                                ? 'bg-green-500 text-white animate-pulse' 
                                : 'text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDownloadMessage(msg.id, msg.text)}
                            className="p-2 text-slate-500 hover:bg-slate-200 rounded transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleSpeakMessage(msg.id, msg.text)}
                            className={`p-2 rounded transition-colors ${
                              speakingMessageId === msg.id
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <Mic className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleMessageAction(msg.id, 'liked')}
                            className={`p-2 rounded transition-colors ${
                              messageActions[msg.id]?.liked 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : 'text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleMessageAction(msg.id, 'disliked')}
                            className={`p-2 rounded transition-colors ${
                              messageActions[msg.id]?.disliked 
                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                : 'text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleMessageAction(msg.id, 'starred')}
                            className={`p-2 rounded transition-colors ${
                              messageActions[msg.id]?.starred 
                                ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                                : 'text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <Star className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleMessageAction(msg.id, 'bookmarked')}
                            className={`p-2 rounded transition-colors ${
                              messageActions[msg.id]?.bookmarked 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            <Bookmark className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleShareMessage(msg.id, msg.text)}
                            className="p-2 text-slate-500 hover:bg-slate-200 rounded transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <span className="text-xs text-slate-400 ml-2">{msg.timestamp}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {/* Scroll anchor for auto-scroll */}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 p-4 flex-shrink-0 sticky bottom-0 bg-white z-20">
            <div className="max-w-4xl mx-auto">
              {/* Pending Files Preview */}
              {pendingFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {pendingFiles.map((pendingFile) => (
                    <div key={pendingFile.id} className="relative group">
                      {pendingFile.previewUrl ? (
                        <div className="relative">
                          <img 
                            src={pendingFile.previewUrl} 
                            alt={pendingFile.file.name}
                            className="w-16 h-16 object-cover rounded border border-gray-300"
                          />
                          <button
                            onClick={() => removePendingFile(pendingFile.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative flex items-center p-2 bg-gray-100 rounded border border-gray-300 w-32">
                          <FileIcon className="w-4 h-4 text-gray-500 mr-2" />
                          <span className="text-xs truncate">{pendingFile.file.name}</span>
                          <button
                            onClick={() => removePendingFile(pendingFile.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type something..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`absolute right-12 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-100 rounded transition-colors ${
                      isListening ? 'bg-red-100 text-red-600' : 'text-slate-500'
                    }`}
                  >
                    <Mic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachmentModalOpen(true)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors ${
                      pendingFiles.length > 0 
                        ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                        : 'hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Plus className="w-5 h-5" />
                    {pendingFiles.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {pendingFiles.length}
                      </span>
                    )}
                  </button>
                </div>
                
                <button
                  type="submit"
                  disabled={!message.trim() && pendingFiles.length === 0}
                  className={`p-3 rounded-lg transition-colors flex items-center ${
                    message.trim() || pendingFiles.length > 0
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-5 h-5" />
                  {pendingFiles.length > 0 && (
                    <span className="ml-2 text-xs bg-blue-800 rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingFiles.length}
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* File Attachment Modal */}
      {attachmentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Attach Files</h3>
              <button
                onClick={() => setAttachmentModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handleFileAttachment('image')}
                className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ImageIcon className="w-5 h-5 text-gray-600" />
                <span className="text-gray-800">Attach Image</span>
              </button>
              
              <button
                onClick={() => handleFileAttachment('file')}
                className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileIcon className="w-5 h-5 text-gray-600" />
                <span className="text-gray-800">Attach File</span>
              </button>
              
              <button
                onClick={() => handleFileAttachment('document')}
                className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Paperclip className="w-5 h-5 text-gray-600" />
                <span className="text-gray-800">Attach Document</span>
              </button>
              
              {/* Add Attach from Workspace option */}
              {currentWorkspaceId && (
                <button
                  onClick={() => handleFileAttachment('workspace')}
                  className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Folder className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-800">Attach from Workspace</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workspace Files Modal */}
      {workspaceFilesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Workspace Files</h3>
              <button
                onClick={() => setWorkspaceFilesModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loadingWorkspaceFiles ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  Loading files...
                </div>
              ) : workspaceFiles.length === 0 ? (
                <div className="text-center py-8">
                  <FileIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No files found</h3>
                  <p className="text-gray-500">This workspace doesn't have any files yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {workspaceFiles.map((file) => (
                    <div
                      key={file.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleAttachWorkspaceFile(file)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {file.mimeType.startsWith('image/') ? (
                            <ImageIcon className="w-5 h-5 text-blue-600" />
                          ) : (
                            <FileIcon className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{file.originalName}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {new Date(file.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t flex justify-end">
              <button
                onClick={() => setWorkspaceFilesModalOpen(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Format Modal */}
      {downloadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Download Message</h3>
              <button
                onClick={() => setDownloadModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">Choose the format you want to download this message in:</p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleDownloadFormat('pdf')}
                className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileIcon className="w-5 h-5 text-red-600" />
                <div className="text-left">
                  <div className="font-medium text-gray-800">PDF Document</div>
                  <div className="text-sm text-gray-500">Download as PDF file</div>
                </div>
              </button>
              
              <button
                onClick={() => handleDownloadFormat('word')}
                className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FileIcon className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium text-gray-800">Word Document</div>
                  <div className="text-sm text-gray-500">Download as DOCX file</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      )}
    </>
  );
};

export default Dashboard;
