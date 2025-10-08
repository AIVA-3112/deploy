export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  isAssigned: boolean;
  accessLevel?: string;
  assignedAt?: string;
  name?: string;
  role?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  createdDate: string;
  chatCount: number;
  lastActivity: string;
  isShared: boolean;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  isLoading?: boolean;
  isError?: boolean;
}

export interface BookmarkedMessage {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  category: 'Reports' | 'Documentation' | 'Process' | 'Templates' | 'Conversation';
}

export interface LikedMessage {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  category: 'Reports' | 'Documentation' | 'Process' | 'Templates' | 'Conversation';
}

export interface DislikedMessage {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  category: 'Reports' | 'Documentation' | 'Process' | 'Templates' | 'Conversation';
}

export interface ChatHistory {
  id: string;
  title: string;
  description: string;
  date: string;
  messageCount: number;
  lastMessage: string;
}