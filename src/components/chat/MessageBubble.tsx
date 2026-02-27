'use client';

import React, { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { motion } from 'framer-motion';
import { Copy, Check, RefreshCw, Pencil } from 'lucide-react';
import { Message } from '@/types';
import { cn, formatTime } from '@/lib/utils';

interface MessageBubbleProps {
    message: Message;
    isLast?: boolean;
    isLoading?: boolean;
    onRegenerate?: () => void;
    onEdit?: (id: string, content: string) => void;
}

export default function MessageBubble({
    message,
    isLast,
    isLoading,
    onRegenerate,
    onEdit,
}: MessageBubbleProps) {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);

    const isUser = message.role === 'user';

    const handleCopyCode = useCallback(async (code: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    }, []);

    const handleEdit = useCallback(() => {
        if (editContent.trim() && onEdit) {
            onEdit(message.id, editContent.trim());
            setIsEditing(false);
        }
    }, [editContent, message.id, onEdit]);

    const components = useMemo(() => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pre: ({ children, ...props }: any) => {
            const codeElement = React.Children.toArray(children).find(
                (child: unknown) => React.isValidElement(child) && (child as React.ReactElement<{ children?: React.ReactNode }>).type === 'code'
            ) as React.ReactElement<{ children?: React.ReactNode }> | undefined;

            const codeContent = codeElement?.props?.children
                ? String(codeElement.props.children).replace(/\n$/, '')
                : '';

            return (
                <div className="code-block-wrapper">
                    <pre {...props}>{children}</pre>
                    <button
                        className="copy-button"
                        onClick={() => handleCopyCode(codeContent)}
                    >
                        {copiedCode === codeContent ? (
                            <span className="flex items-center gap-1"><Check size={12} /> コピー済み</span>
                        ) : (
                            <span className="flex items-center gap-1"><Copy size={12} /> コピー</span>
                        )}
                    </button>
                </div>
            );
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        a: ({ href, children, ...props }: any) => (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
            </a>
        ),
    }), [copiedCode, handleCopyCode]);

    if (isEditing) {
        return (
            <motion.div
                className={cn('flex w-full mb-4 px-4 justify-end')}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
            >
                <div className="max-w-[80%] md:max-w-[70%] w-full">
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-3 rounded-xl bg-input-bg border border-input-border 
                       focus:border-input-focus focus:outline-none resize-none min-h-[80px]
                       text-foreground"
                        rows={3}
                    />
                    <div className="flex gap-2 mt-2 justify-end">
                        <button
                            onClick={() => { setIsEditing(false); setEditContent(message.content); }}
                            className="px-3 py-1.5 text-sm rounded-lg bg-muted text-muted-foreground hover:opacity-80 transition-opacity"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleEdit}
                            className="px-3 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors"
                        >
                            送信
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={cn(
                'flex w-full mb-4 px-4',
                isUser ? 'justify-end' : 'justify-start'
            )}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
        >
            {/* Avatar for assistant */}
            {!isUser && (
                <div className="flex-shrink-0 mr-3 mt-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden shadow-md border border-border">
                        <img
                            src="/shin_icon.png"
                            alt="Shin君"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            )}

            <div className={cn('max-w-[80%] md:max-w-[70%] group relative')}>
                <div
                    className={cn(
                        'rounded-3xl px-6 py-4 shadow-md',
                        isUser
                            ? 'bg-user-bubble text-user-bubble-text rounded-br-md'
                            : 'bg-assistant-bubble text-assistant-bubble-text rounded-bl-md border border-border'
                    )}
                >
                    {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed text-[0.95rem]">{message.content}</p>
                    ) : (
                        <div className="markdown-body text-[0.95rem]">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                                components={components}
                            >
                                {message.content}
                            </ReactMarkdown>
                            {isLoading && isLast && (
                                <span className="typing-cursor" />
                            )}
                        </div>
                    )}
                </div>

                {/* Timestamp */}
                <div className={cn(
                    'text-[0.7rem] text-muted-foreground mt-1 px-1',
                    isUser ? 'text-right' : 'text-left'
                )}>
                    {formatTime(message.timestamp)}
                </div>

                {/* Action buttons */}
                {!isLoading && message.content && (
                    <div className={cn(
                        'absolute -bottom-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                        isUser ? 'right-0' : 'left-11'
                    )}>
                        {isUser && onEdit && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1.5 rounded-md bg-muted hover:bg-accent text-muted-foreground 
                           hover:text-foreground transition-colors"
                                title="編集して再送信"
                            >
                                <Pencil size={13} />
                            </button>
                        )}
                        {!isUser && isLast && onRegenerate && (
                            <button
                                onClick={onRegenerate}
                                className="p-1.5 rounded-md bg-muted hover:bg-accent text-muted-foreground 
                           hover:text-foreground transition-colors"
                                title="再生成"
                            >
                                <RefreshCw size={13} />
                            </button>
                        )}
                        {!isUser && (
                            <button
                                onClick={() => navigator.clipboard.writeText(message.content)}
                                className="p-1.5 rounded-md bg-muted hover:bg-accent text-muted-foreground 
                           hover:text-foreground transition-colors"
                                title="コピー"
                            >
                                <Copy size={13} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
