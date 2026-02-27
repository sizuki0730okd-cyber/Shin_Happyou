'use client';

import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

interface TypingIndicatorProps {
    isSearching?: boolean;
    searchQuery?: string | null;
}

export default function TypingIndicator({ isSearching, searchQuery }: TypingIndicatorProps) {
    return (
        <motion.div
            className="flex w-full mb-4 px-4 justify-start"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
        >
            <div className="flex-shrink-0 mr-3 mt-1">
                <div className="w-8 h-8 rounded-full overflow-hidden shadow-md border border-border">
                    <img
                        src="/shin_icon.png"
                        alt="Shin君"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>

            <div className="bg-assistant-bubble text-assistant-bubble-text rounded-2xl rounded-bl-md 
                      px-4 py-3 shadow-sm border border-border">
                {isSearching ? (
                    <div className="flex items-center gap-2 search-pulse">
                        <Search size={14} className="text-primary" />
                        <span className="text-sm text-muted-foreground">
                            検索中{searchQuery ? `：「${searchQuery}」` : '...'}
                        </span>
                    </div>
                ) : (
                    <div className="dot-animation flex items-center gap-1.5 py-1 px-1">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                    </div>
                )}
            </div>
        </motion.div>
    );
}
