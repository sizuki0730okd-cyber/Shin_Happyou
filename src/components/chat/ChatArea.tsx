'use client';

import { useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Message } from '@/types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface ChatAreaProps {
    messages: Message[];
    isLoading: boolean;
    isSearching: boolean;
    searchQuery: string | null;
    onRegenerate: () => void;
    onEdit: (id: string, content: string) => void;
}

export default function ChatArea({
    messages,
    isLoading,
    isSearching,
    searchQuery,
    onRegenerate,
    onEdit,
}: ChatAreaProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const hasMessages = messages.length > 0;

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto"
        >
            {!hasMessages ? (
                <div className="flex flex-col items-center justify-center h-full px-4 text-center">
                    <div className="max-w-md">
                        {/* Logo */}
                        <div className="mb-6">
                            <div className="w-24 h-24 mx-auto rounded-3xl overflow-hidden shadow-xl shadow-indigo-500/10 border-2 border-white dark:border-border">
                                <img
                                    src="/shin_icon.png"
                                    alt="Shin君 Logo"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold mb-2">
                            <span className="gradient-text">Shin君</span>
                            <span className="text-foreground">へようこそ</span>
                        </h2>
                        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                            木更津市・木更津高校に詳しい専門AIです。<br />
                            地域の情報から一般的な質問まで、なんでも聞いてください。
                        </p>

                        {/* Suggestion chips */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                            {[
                                { emoji: '🌉', text: '木更津のおすすめ観光スポットは？' },
                                { emoji: '🏫', text: '木更津高校の特徴を教えて' },
                                { emoji: '🎆', text: '木更津の夏祭り情報' },
                                { emoji: '🍽️', text: '木更津駅周辺のグルメ' },
                            ].map((suggestion, i) => (
                                <button
                                    key={i}
                                    className="text-left p-3 rounded-xl border border-border bg-card hover:bg-accent 
                             transition-colors text-sm group"
                                    onClick={() => {
                                        const event = new CustomEvent('suggestion-click', {
                                            detail: suggestion.text,
                                        });
                                        window.dispatchEvent(event);
                                    }}
                                >
                                    <span className="text-lg mb-1 block">{suggestion.emoji}</span>
                                    <span className="text-card-foreground group-hover:text-accent-foreground text-[0.85rem]">
                                        {suggestion.text}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto py-10 md:py-16 px-2 sm:px-4">
                    <AnimatePresence mode="popLayout">
                        {messages.map((message, index) => (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                isLast={index === messages.length - 1}
                                isLoading={isLoading && index === messages.length - 1 && message.role === 'assistant'}
                                onRegenerate={index === messages.length - 1 ? onRegenerate : undefined}
                                onEdit={message.role === 'user' ? onEdit : undefined}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Show typing indicator when loading and last message is user's */}
                    {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                        <TypingIndicator isSearching={isSearching} searchQuery={searchQuery} />
                    )}

                    {/* Show search indicator during search phase */}
                    {isSearching && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                        <div className="flex justify-start px-4 mb-2">
                            <div className="text-xs text-muted-foreground search-pulse flex items-center gap-1 ml-11">
                                🔍 Web検索を実行しました{searchQuery ? `：「${searchQuery}」` : ''}
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            )}
        </div>
    );
}
