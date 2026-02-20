import { useRef, useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileUpIcon, SendIcon } from 'lucide-react';
import { MessageBubble, type Message as ChatMessage } from '@/components/MessageBuddle';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '../ui/alert-dialog';
import type { IFile } from '@/hooks/useChatMessages';

const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

interface MessageAreaProps {
    messages: ChatMessage[];
    currentUsername: string;
    input: string;
    isSending: boolean;
    isConnected: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    chatId: string;
    sendFile: (file: IFile) => void;
}

export function MessageArea({
    messages,
    currentUsername,
    input,
    isSending,
    isConnected,
    onInputChange,
    onSend,
    onKeyDown,
    chatId,
    sendFile,
}: MessageAreaProps) {
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [userScrolled, setUserScrolled] = useState(false);

    useEffect(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
        if (!viewport) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = viewport;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
            if (!isNearBottom) setUserScrolled(true);
            else setUserScrolled(false);
        };

        viewport.addEventListener('scroll', handleScroll);
        return () => viewport.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (scrollAreaRef.current && !userScrolled) {
            const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]');
            if (viewport) {
                viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages, userScrolled]);

    const nameMessage = messages.find(message => message.type === 'name');
    let roomName = nameMessage?.msg || `房间${chatId}`;
    if (chatId === '26329675') {
        roomName = '项目大群';
    }

    return (
        <div className="flex-1 flex flex-col">
            <div className="p-3 flex gap-2 border-b items-end">
                <h1 className="text-lg font-bold">{roomName}</h1>
                <span className="text-gray-500 text-sm">ID: {chatId}</span>
            </div>
            <ScrollArea ref={scrollAreaRef} className="flex-1 h-[calc(100%-124px)] p-4 relative">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400">消息正在加载中...</div>
                ) : (
                    messages.map((message, index) => (
                        <MessageBubble
                            key={`${message.time}-${index}`}
                            message={message}
                            currentUsername={currentUsername}
                            formatTime={formatTime}
                        />
                    ))
                )}
            </ScrollArea>

            <div className="p-3 flex gap-2 items-center bg-white border-t">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="icon-sm" disabled={isSending || !isConnected}>
                            <FileUpIcon />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>分享文件</AlertDialogTitle>
                            <AlertDialogDescription>
                                <iframe src="https://new-xes-pan.netlify.app/upload" />
                                <p>请将文件在这里上传，后来把数据填入下方表单</p>
                                <Input placeholder="请输入给你的数据" ref={inputRef} />
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => {
                                    sendFile(JSON.parse(inputRef.current?.value || ''));
                                }}
                            >
                                分享
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <Input
                    disabled={isSending || !isConnected}
                    value={input}
                    onChange={e => onInputChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="请输入文本"
                    className="flex-1"
                />
                <Button onClick={onSend} size="icon-sm" disabled={isSending || !isConnected || input.trim() === ''}>
                    <SendIcon className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
