import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { XESCloudValue, MessageCacheManager } from '@/lib/XesCloud';
import type { Message as ChatMessage, Message } from '@/components/FileDisplay';

export interface IFile {
    name: string;
    link: string;
    size: string;
    time: string;
}

function deduplicateMessages(messages: ChatMessage[]): ChatMessage[] {
    const messageMap = new Map<number, ChatMessage>();

    messages.forEach(msg => {
        const existingMsg = messageMap.get(msg.time);
        if (!existingMsg || msg.recalled) {
            messageMap.set(msg.time, msg);
        }
    });

    return Array.from(messageMap.values()).sort((a, b) => a.time - b.time);
}

export const parseMessages = (allMessages: Record<string, string>): ChatMessage[] => {
    const parsed: ChatMessage[] = [];
    Object.entries(allMessages).forEach(([payload, timestampStr]) => {
        try {
            const parsedJson = JSON.parse(payload);
            const time = Number(timestampStr) || Number(parsedJson.time) || 0;
            parsed.push({
                username: parsedJson.username || '未知用户',
                msg: parsedJson.msg || '',
                time,
                type: parsedJson.type || undefined,
                recalled: parsedJson.recalled || false,
                quoteTimeStamp: parsedJson.quoteTimeStamp || undefined,
            });
        } catch (e) {
            toast.error('解析消息失败');
            console.warn('解析消息失败:', e, payload);
        }
    });

    return deduplicateMessages(parsed);
};

export function useChatMessages(chatId: number, username: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isSending, setIsSending] = useState(false);
    const xRef = useRef<XESCloudValue | null>(null);
    const cacheManagerRef = useRef(
        new MessageCacheManager({
            memoryMaxSize: 200,
            localStorageExpiry: 30 * 60 * 1000,
            version: 1,
        }),
    );
    const pollingRef = useRef<number | null>(null);

    useEffect(() => {
        startPolling();
        return () => {
            stopPolling();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatId]);

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const cleanupResources = () => {
        stopPolling();
        if (xRef.current) {
            xRef.current.clearCache();
            xRef.current = null;
        }
    };

    const fetchMessages = async () => {
        if (!xRef.current) return;

        try {
            const cacheManager = cacheManagerRef.current;
            let allMessages: Record<string, string> = {};

            const cachedMessages = cacheManager.get(chatId);
            if (cachedMessages) {
                allMessages = cachedMessages;
            } else {
                allMessages = await xRef.current.getAllNum();
                cacheManager.set(chatId, allMessages);
            }

            setMessages(parseMessages(allMessages));
        } catch (e) {
            console.error('获取消息失败:', e);
            toast.error('获取消息失败，请检查连接');
        }
    };

    const startPolling = () => {
        cleanupResources();
        xRef.current = new XESCloudValue(String(chatId));

        fetchMessages();
        pollingRef.current = window.setInterval(async () => {
            if (!xRef.current) return;
            try {
                const freshMessages = await xRef.current.getAllNum();
                cacheManagerRef.current.set(chatId, freshMessages);
                fetchMessages();
            } catch (e) {
                console.error('更新缓存失败:', e);
            }
        }, 5000);
    };

    const sendMessage = async (content: string, quoteMessage?: ChatMessage): Promise<boolean> => {
        if (!content.trim() || !xRef.current) return false;

        setIsSending(true);
        try {
            const time = Date.now() / 1000;
            const payload = JSON.stringify({
                username: username || '匿名用户',
                msg: content.trim(),
                time,
                recalled: false,
                quoteTimeStamp: quoteMessage?.time,
            } as Message);

            await xRef.current.sendNum(payload, String(time));

            cacheManagerRef.current.clear(chatId);
            const freshMessages = await xRef.current.getAllNum();
            cacheManagerRef.current.set(chatId, freshMessages);
            setMessages(parseMessages(freshMessages));

            toast.success('发送成功');
            return true;
        } catch (e) {
            toast.error('发送失败');
            console.error(`发送消息失败: ${e}`);
            return false;
        } finally {
            setIsSending(false);
        }
    };

    const sendFile = async (file: IFile) => {
        if (!xRef.current) return;
        const message: Message = {
            username,
            msg: JSON.stringify(file),
            time: Date.now() / 1000,
            type: 'share',
            recalled: false,
        };
        try {
            await xRef.current.sendNum(JSON.stringify(message), String(Date.now() / 1000));
            cacheManagerRef.current.clear(chatId);
            const freshMessages = await xRef.current.getAllNum();
            cacheManagerRef.current.set(chatId, freshMessages);
            setMessages(parseMessages(freshMessages));
            toast.success('发送成功');
        } catch (e) {
            toast.error('发送失败');
            console.error(`发送文件失败: ${e}`);
        }
    };

    const recallMessage = async (messageTime: number, isAdmin?: boolean): Promise<boolean> => {
        const x = xRef.current;
        if (!x) {
            toast.error('聊天未初始化，无法撤回消息');
            return false;
        }

        const message = messages.find(m => m.time === messageTime);
        if (!message) {
            toast.error('消息不存在，无法撤回');
            return false;
        }

        const currentUsername = username || '匿名用户';
        if (message.username !== currentUsername && !isAdmin) {
            toast.error('只能撤回自己发送的消息');
            return false;
        }

        const now = Date.now() / 1000;
        if (now - message.time > 120) {
            toast.error('只能撤回2分钟内的消息');
            return false;
        }

        try {
            setMessages(prev => {
                const updated = prev.map(m => (m.time === messageTime ? { ...m, recalled: true } : m));
                return deduplicateMessages(updated);
            });

            const recallPayload = JSON.stringify({
                ...message,
                recalled: true,
                msg: `[该消息已撤回]`,
            });

            await x.sendNum(recallPayload, String(messageTime));

            cacheManagerRef.current.clear(chatId);
            const freshMessages = await x.getAllNum();
            cacheManagerRef.current.set(chatId, freshMessages);
            setMessages(parseMessages(freshMessages));

            toast.success('消息撤回成功');
            return true;
        } catch (e) {
            setMessages(prev => {
                const rolledBack = prev.map(m => (m.time === messageTime ? { ...m, recalled: false } : m));
                return deduplicateMessages(rolledBack);
            });

            toast.error('消息撤回失败');
            console.error(`撤回消息失败: ${e}`);
            return false;
        }
    };

    return {
        messages,
        isSending,
        sendMessage,
        sendFile,
        recallMessage,
    };
}
