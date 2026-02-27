'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Trash2, X } from 'lucide-react';
import { Conversation } from '@/types';
import { cn, truncateText } from '@/lib/utils';

interface SidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    onDeleteConversation: (id: string) => void;
}

export default function Sidebar({
    conversations,
    activeConversationId,
    isOpen,
    onClose,
    onSelectConversation,
    onNewConversation,
    onDeleteConversation,
}: SidebarProps) {
    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        if (isToday) return '今日';
        if (isYesterday) return '昨日';
        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    };

    // Group conversations by date
    const grouped = conversations.reduce<Record<string, Conversation[]>>((acc, conv) => {
        const label = formatDate(conv.updatedAt);
        if (!acc[label]) acc[label] = [];
        acc[label].push(conv);
        return acc;
    }, {});

    const sidebarContent = (
        <div className="flex flex-col h-full bg-sidebar-bg">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg overflow-hidden border border-border">
                        <img
                            src="/shin_icon.png"
                            alt="Logo"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    Shin君
                </h2>
                <button
                    onClick={onClose}
                    className="md:hidden p-1.5 rounded-lg hover:bg-sidebar-hover transition-colors text-muted-foreground"
                >
                    <X size={18} />
                </button>
            </div>

            {/* New Chat Button */}
            <div className="p-3">
                <button
                    onClick={() => {
                        onNewConversation();
                        onClose();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border 
                     hover:bg-sidebar-hover transition-colors text-sm font-medium text-foreground"
                >
                    <Plus size={16} />
                    新しいチャット
                </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
                {Object.entries(grouped).map(([dateLabel, convs]) => (
                    <div key={dateLabel} className="mb-3">
                        <p className="text-[0.7rem] text-muted-foreground font-medium px-3 py-1.5 uppercase tracking-wider">
                            {dateLabel}
                        </p>
                        {convs.map(conv => (
                            <motion.button
                                key={conv.id}
                                onClick={() => {
                                    onSelectConversation(conv.id);
                                    onClose();
                                }}
                                className={cn(
                                    'w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors group flex items-center justify-between',
                                    conv.id === activeConversationId
                                        ? 'bg-sidebar-active text-foreground font-medium'
                                        : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground'
                                )}
                                whileHover={{ x: 2 }}
                                transition={{ duration: 0.15 }}
                            >
                                <span className="flex items-center gap-2 flex-1 min-w-0">
                                    <MessageSquare size={14} className="flex-shrink-0 opacity-60" />
                                    <span className="truncate">{truncateText(conv.title, 28)}</span>
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteConversation(conv.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 
                             hover:text-red-500 transition-all flex-shrink-0"
                                    title="削除"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </motion.button>
                        ))}
                    </div>
                ))}

                {conversations.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
                        <p>まだ会話がありません</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop sidebar */}
            <div className="hidden md:flex w-[280px] flex-shrink-0 border-r border-border h-full">
                {sidebarContent}
            </div>

            {/* Mobile overlay */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                            onClick={onClose}
                        />
                        <motion.div
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="md:hidden fixed left-0 top-0 bottom-0 w-[280px] z-50 shadow-2xl"
                        >
                            {sidebarContent}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
