export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isSearching?: boolean;
  searchQuery?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
}

export interface ChatRequestBody {
  messages: { role: string; content: string }[];
  stream?: boolean;
}
