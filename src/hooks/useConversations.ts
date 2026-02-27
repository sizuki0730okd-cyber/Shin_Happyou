'use client';

import { useState, useEffect, useCallback } from 'react';
import { Conversation, Message } from '@/types';
import { generateId, truncateText } from '@/lib/utils';

const STORAGE_KEY = 'shin-kun-conversations';

export function useConversations() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as Conversation[];
                setConversations(parsed);
            }
        } catch {
            // Ignore parse errors
        }
    }, []);

    // Save to localStorage whenever conversations change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
        } catch {
            // Ignore storage errors
        }
    }, [conversations]);

    const createConversation = useCallback((): string => {
        const id = generateId();
        const newConv: Conversation = {
            id,
            title: '新しいチャット',
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        setConversations(prev => [newConv, ...prev]);
        setActiveConversationId(id);
        return id;
    }, []);

    const updateConversation = useCallback((id: string, messages: Message[]) => {
        setConversations(prev =>
            prev.map(conv => {
                if (conv.id !== id) return conv;

                // Auto-generate title from first user message
                let title = conv.title;
                if (title === '新しいチャット' && messages.length > 0) {
                    const firstUserMsg = messages.find(m => m.role === 'user');
                    if (firstUserMsg) {
                        title = truncateText(firstUserMsg.content, 30);
                    }
                }

                return {
                    ...conv,
                    title,
                    messages,
                    updatedAt: Date.now(),
                };
            })
        );
    }, []);

    const deleteConversation = useCallback((id: string) => {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
            setActiveConversationId(null);
        }
    }, [activeConversationId]);

    const getActiveConversation = useCallback((): Conversation | undefined => {
        return conversations.find(c => c.id === activeConversationId);
    }, [conversations, activeConversationId]);

    return {
        conversations,
        activeConversationId,
        setActiveConversationId,
        createConversation,
        updateConversation,
        deleteConversation,
        getActiveConversation,
    };
}
