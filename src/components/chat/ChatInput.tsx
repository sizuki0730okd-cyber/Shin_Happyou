'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
    onSend: (message: string) => void;
    onStop?: () => void;
    isLoading: boolean;
    disabled?: boolean;
}

export default function ChatInput({ onSend, onStop, isLoading, disabled }: ChatInputProps) {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    }, []);

    useEffect(() => {
        adjustHeight();
    }, [input, adjustHeight]);

    const handleSend = useCallback(() => {
        if (input.trim() && !isLoading && !disabled) {
            onSend(input);
            setInput('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    }, [input, isLoading, disabled, onSend]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const canSend = input.trim().length > 0 && !isLoading && !disabled;

    return (
        <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 py-4 md:py-6">
            <div className="max-w-4xl mx-auto">
                <div className={cn(
                    "flex items-end gap-2 bg-input-bg border rounded-2xl px-4 py-3 md:px-6",
                    "transition-colors duration-200",
                    "border-input-border focus-within:border-input-focus focus-within:shadow-[0_0_0_2px_rgba(99,102,241,0.1)]"
                )}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Shin君に質問する..."
                        disabled={disabled}
                        rows={1}
                        className="flex-1 bg-transparent text-foreground placeholder-muted-foreground 
                       resize-none outline-none text-[0.95rem] leading-relaxed py-1.5
                       max-h-[200px] min-h-[24px]"
                    />

                    {isLoading ? (
                        <motion.button
                            onClick={onStop}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-500 hover:bg-red-600
                         flex items-center justify-center transition-colors mb-0.5"
                            title="生成を停止"
                        >
                            <Square size={14} className="text-white fill-white" />
                        </motion.button>
                    ) : (
                        <motion.button
                            onClick={handleSend}
                            disabled={!canSend}
                            whileHover={canSend ? { scale: 1.05 } : {}}
                            whileTap={canSend ? { scale: 0.95 } : {}}
                            className={cn(
                                "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all mb-0.5",
                                canSend
                                    ? "bg-primary hover:bg-primary-hover text-white shadow-md"
                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                            )}
                            title="送信 (Enter)"
                        >
                            <Send size={16} className={canSend ? '' : 'opacity-50'} />
                        </motion.button>
                    )}
                </div>

                <p className="text-[0.7rem] text-muted-foreground text-center mt-2 opacity-60">
                    Shin君は木更津の情報に特化していますが、一般的な質問にも対応します
                </p>
            </div>
        </div>
    );
}
