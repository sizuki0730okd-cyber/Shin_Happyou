'use client';

import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Menu, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeaderProps {
    onToggleSidebar: () => void;
    conversationTitle?: string;
}

export default function Header({ onToggleSidebar, conversationTitle }: HeaderProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <header className="flex items-center justify-between px-4 py-3 border-b border-border 
                        bg-background/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <button
                    onClick={onToggleSidebar}
                    className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                >
                    <Menu size={20} />
                </button>

                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg overflow-hidden border border-border md:hidden">
                        <img
                            src="/shin_icon.png"
                            alt="Logo"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <h1 className="font-semibold text-foreground text-sm leading-tight">
                            {conversationTitle || 'Shin君'}
                        </h1>
                        {!conversationTitle && (
                            <p className="text-[0.65rem] text-muted-foreground leading-tight">
                                木更津の専門AI
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {mounted && (
                    <motion.button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                        title="テーマ切替"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </motion.button>
                )}
            </div>
        </header>
    );
}
