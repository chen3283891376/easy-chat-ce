import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { XESCloudValue, MessageCacheManager } from "@/lib/XesCloud";
import type { Message, IFile } from "@/lib/types";

const CACHE_EXPIRY = 30 * 60 * 1000;
const POLLING_INTERVAL = 5000;
const MS_TO_SECONDS = 1000;
const RECALL_TIME_LIMIT = 120;
const MEMORY_CACHE_SIZE = 200;
const CACHE_VERSION = 1;

function deduplicateMessages(messages: Message[]): Message[] {
    const messageMap = new Map<number, Message>();
    messages.forEach((msg) => {
        const existingMsg = messageMap.get(msg.time);
        if (!existingMsg || msg.recalled === true) {
            messageMap.set(msg.time, msg);
        }
    });
    return Array.from(messageMap.values()).sort((a, b) => a.time - b.time);
}

export function parseMessages(allMessages: Record<string, string>): Message[] {
    const parsed: Message[] = [];
    Object.entries(allMessages).forEach(([payload, timestampStr]) => {
        try {
            const parsedJson = JSON.parse(payload);
            if (typeof parsedJson === "object" && parsedJson !== null) {
                const time = Number(timestampStr) || Number(parsedJson.time) || 0;
                parsed.push({
                    username: typeof parsedJson.username === "string" ? parsedJson.username : "匿名用户",
                    msg: typeof parsedJson.msg === "string" ? parsedJson.msg : "",
                    time,
                    type: typeof parsedJson.type === "string" ? parsedJson.type : undefined,
                    recalled: typeof parsedJson.recalled === "boolean" ? parsedJson.recalled : false,
                    quoteTimeStamp:
                        typeof parsedJson.quoteTimeStamp === "number" ? parsedJson.quoteTimeStamp : undefined,
                });
            }
        } catch (e) {
            toast.error("解析消息失败");
            console.warn("解析消息失败:", e, payload);
        }
    });
    return deduplicateMessages(parsed);
}

export function useChatMessages(chatId: number, username: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isSending, setIsSending] = useState(false);
    const xRef = useRef<XESCloudValue | null>(null);
    const cacheManagerRef = useRef(
        new MessageCacheManager({
            memoryMaxSize: MEMORY_CACHE_SIZE,
            localStorageExpiry: CACHE_EXPIRY,
            version: CACHE_VERSION,
        }),
    );
    const pollingRef = useRef<number | null>(null);

    const stopPolling = useCallback(() => {
        if (pollingRef.current !== null) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const fetchMessages = useCallback(async () => {
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
            console.error("获取消息失败:", e);
            toast.error("获取消息失败，请检查连接");
        }
    }, [chatId]);

    const cleanupResources = useCallback(() => {
        stopPolling();
        if (xRef.current) {
            xRef.current.clearCache();
            xRef.current = null;
        }
    }, [stopPolling]);

    const startPolling = useCallback(() => {
        cleanupResources();
        xRef.current = new XESCloudValue(String(chatId));

        void fetchMessages();
        pollingRef.current = window.setInterval(async () => {
            if (!xRef.current) return;
            try {
                const freshMessages = await xRef.current.getAllNum();
                cacheManagerRef.current.set(chatId, freshMessages);
                void fetchMessages();
            } catch (e) {
                console.error("更新缓存失败:", e);
            }
        }, POLLING_INTERVAL);
    }, [chatId, cleanupResources, fetchMessages]);

    useEffect(() => {
        startPolling();
        return () => {
            stopPolling();
        };
    }, [chatId, startPolling, stopPolling]);

    const sendMessage = useCallback(async (content: string, quoteMessage?: Message): Promise<boolean> => {
        if (!content.trim() || !xRef.current) return false;

        setIsSending(true);
        try {
            const time = Date.now() / MS_TO_SECONDS;
            const payload = JSON.stringify({
                username: username || "匿名用户",
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

            toast.success("发送成功");
            return true;
        } catch (e) {
            toast.error("发送失败");
            console.error("发送消息失败:", e);
            return false;
        } finally {
            setIsSending(false);
        }
    }, [chatId, username]);

    const sendFile = useCallback(async (file: IFile) => {
        if (!xRef.current) return;
        const message: Message = {
            username,
            msg: JSON.stringify(file),
            time: Date.now() / MS_TO_SECONDS,
            type: "share",
            recalled: false,
        };
        try {
            await xRef.current.sendNum(JSON.stringify(message), String(Date.now() / MS_TO_SECONDS));
            cacheManagerRef.current.clear(chatId);
            const freshMessages = await xRef.current.getAllNum();
            cacheManagerRef.current.set(chatId, freshMessages);
            setMessages(parseMessages(freshMessages));
            toast.success("发送成功");
        } catch (e) {
            toast.error("发送失败");
            console.error("发送文件失败:", e);
        }
    }, [chatId, username]);

    const recallMessage = useCallback(async (messageTime: number, isAdmin?: boolean): Promise<boolean> => {
        const x = xRef.current;
        if (!x) {
            toast.error("聊天未初始化，无法撤回消息");
            return false;
        }

        const message = messages.find((m) => m.time === messageTime);
        if (!message) {
            toast.error("消息不存在，无法撤回");
            return false;
        }

        const currentUsername = username || "匿名用户";
        if (message.username !== currentUsername && isAdmin !== true) {
            toast.error("只能撤回自己发送的消息");
            return false;
        }

        const now = Date.now() / MS_TO_SECONDS;
        if (now - message.time > RECALL_TIME_LIMIT) {
            toast.error("只能撤回2分钟内的消息");
            return false;
        }

        try {
            setMessages((prev) => {
                const updated = prev.map((m) => (m.time === messageTime ? { ...m, recalled: true } : m));
                return deduplicateMessages(updated);
            });

            const recallPayload = JSON.stringify({
                ...message,
                recalled: true,
                msg: "[该消息已撤回]",
            });

            await x.sendNum(recallPayload, String(messageTime));

            cacheManagerRef.current.clear(chatId);
            const freshMessages = await x.getAllNum();
            cacheManagerRef.current.set(chatId, freshMessages);
            setMessages(parseMessages(freshMessages));

            toast.success("消息撤回成功");
            return true;
        } catch (e) {
            setMessages((prev) => {
                const rolledBack = prev.map((m) => (m.time === messageTime ? { ...m, recalled: false } : m));
                return deduplicateMessages(rolledBack);
            });

            toast.error("消息撤回失败");
            console.error("撤回消息失败:", e);
            return false;
        }
    }, [chatId, username, messages]);

    return {
        messages,
        isSending,
        sendMessage,
        sendFile,
        recallMessage,
    };
}