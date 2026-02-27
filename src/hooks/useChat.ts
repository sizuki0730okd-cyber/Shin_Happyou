'use client';

import { useState, useCallback, useRef } from 'react';
import { Message } from '@/types';
import { generateId } from '@/lib/utils';

export function useChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return;

        const userMessage: Message = {
            id: generateId(),
            role: 'user',
            content: content.trim(),
            timestamp: Date.now(),
        };

        const assistantMessage: Message = {
            id: generateId(),
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMessage, assistantMessage]);
        setIsLoading(true);
        setIsSearching(false);
        setSearchQuery(null);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const allMessages = [...messages, userMessage].map(m => ({
                role: m.role,
                content: m.content,
            }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: allMessages }),
                signal: abortController.signal,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP Error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response body');

            const decoder = new TextDecoder();
            let accumulatedContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.searchPerformed) {
                                setIsSearching(true);
                                setSearchQuery(data.searchQuery || null);
                                continue;
                            }

                            if (data.content) {
                                accumulatedContent += data.content;
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const lastIdx = updated.length - 1;
                                    if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                                        updated[lastIdx] = {
                                            ...updated[lastIdx],
                                            content: accumulatedContent,
                                        };
                                    }
                                    return updated;
                                });
                            }
                        } catch {
                            // Skip malformed lines
                        }
                    }
                }
            }
        } catch (error) {
            if ((error as Error).name === 'AbortError') return;

            setMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                    updated[lastIdx] = {
                        ...updated[lastIdx],
                        content: `⚠️ エラーが発生しました: ${(error as Error).message}\n\n.env.local にAPIキーが正しく設定されているか確認してください。`,
                    };
                }
                return updated;
            });
        } finally {
            setIsLoading(false);
            setIsSearching(false);
            setSearchQuery(null);
            abortControllerRef.current = null;
        }
    }, [messages, isLoading]);

    const regenerateLastMessage = useCallback(async () => {
        if (isLoading || messages.length < 2) return;

        const lastUserMsgIndex = messages.findLastIndex(m => m.role === 'user');
        if (lastUserMsgIndex === -1) return;

        const lastUserContent = messages[lastUserMsgIndex].content;
        const newMessages = messages.slice(0, lastUserMsgIndex);
        setMessages(newMessages);

        // Wait for state update then resend
        setTimeout(() => {
            sendMessage(lastUserContent);
        }, 50);
    }, [messages, isLoading, sendMessage]);

    const editAndResend = useCallback(async (messageId: string, newContent: string) => {
        if (isLoading) return;

        const msgIndex = messages.findIndex(m => m.id === messageId);
        if (msgIndex === -1) return;

        const newMessages = messages.slice(0, msgIndex);
        setMessages(newMessages);

        setTimeout(() => {
            sendMessage(newContent);
        }, 50);
    }, [messages, isLoading, sendMessage]);

    const stopGeneration = useCallback(() => {
        abortControllerRef.current?.abort();
        setIsLoading(false);
        setIsSearching(false);
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setIsLoading(false);
        setIsSearching(false);
        setSearchQuery(null);
    }, []);

    return {
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
    };
}
