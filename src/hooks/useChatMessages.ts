import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { XESCloudValue, MessageCacheManager } from '@/lib/XesCloud';
import type { Message as ChatMessage, Message } from '@/components/MessageBuddle';

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
                type: parsedJson.type === 'name' ? 'name' : undefined,
            });
        } catch (e) {
            toast.error('解析消息失败');
            console.warn('解析消息失败:', e, payload);
        }
    });
    return parsed.sort((a, b) => a.time - b.time);
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
        return () => stopPolling();
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

    const sendMessage = async (content: string): Promise<boolean> => {
        if (!content.trim() || !xRef.current) return false;

        setIsSending(true);
        try {
            const time = Date.now() / 1000;
            const payload = JSON.stringify({
                username: username || '匿名用户',
                msg: content.trim(),
                time
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

    return {
        messages,
        isSending,
        sendMessage,
    };
}
