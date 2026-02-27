'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/sidebar/Sidebar';
import Header from '@/components/layout/Header';
import ChatArea from '@/components/chat/ChatArea';
import ChatInput from '@/components/chat/ChatInput';
import { useChat } from '@/hooks/useChat';
import { useConversations } from '@/hooks/useConversations';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    messages,
    setMessages,
    isLoading,
    isSearching,
    searchQuery,
    sendMessage,
    regenerateLastMessage,
    editAndResend,
    stopGeneration,
    clearMessages,
  } = useChat();

  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    updateConversation,
    deleteConversation,
    getActiveConversation,
  } = useConversations();

  // Sync messages with active conversation
  useEffect(() => {
    if (activeConversationId && messages.length > 0) {
      updateConversation(activeConversationId, messages);
    }
  }, [messages, activeConversationId, updateConversation]);

  // Handle sending a message
  const handleSendMessage = useCallback((content: string) => {
    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation();
    }
    sendMessage(content);
  }, [activeConversationId, createConversation, sendMessage]);

  // Handle selecting a conversation
  const handleSelectConversation = useCallback((id: string) => {
    // Save current messages first
    if (activeConversationId && messages.length > 0) {
      updateConversation(activeConversationId, messages);
    }

    setActiveConversationId(id);
    const conv = conversations.find(c => c.id === id);
    if (conv) {
      setMessages(conv.messages);
    }
  }, [activeConversationId, messages, updateConversation, setActiveConversationId, conversations, setMessages]);

  // Handle creating a new conversation
  const handleNewConversation = useCallback(() => {
    if (activeConversationId && messages.length > 0) {
      updateConversation(activeConversationId, messages);
    }
    clearMessages();
    setActiveConversationId(null);
  }, [activeConversationId, messages, updateConversation, clearMessages, setActiveConversationId]);

  // Handle suggestion chip clicks
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      handleSendMessage(customEvent.detail);
    };
    window.addEventListener('suggestion-click', handler);
    return () => window.removeEventListener('suggestion-click', handler);
  }, [handleSendMessage]);

  const activeConv = getActiveConversation();

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={deleteConversation}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          conversationTitle={activeConv?.title !== '新しいチャット' ? activeConv?.title : undefined}
        />

        <ChatArea
          messages={messages}
          isLoading={isLoading}
          isSearching={isSearching}
          searchQuery={searchQuery}
          onRegenerate={regenerateLastMessage}
          onEdit={editAndResend}
        />

        <ChatInput
          onSend={handleSendMessage}
          onStop={stopGeneration}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
