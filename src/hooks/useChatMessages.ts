import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { XESCloudValue, MessageCacheManager } from "@/lib/XesCloud";
import type { Message, IFile } from "@/lib/types";

const CACHE_EXPIRY = 30 * 60 * 1000; // 缓存过期时间
const POLLING_INTERVAL = 5000; // 轮询间隔时间
const MS_TO_SECONDS = 1000; // 毫秒转秒的除数
const RECALL_TIME_LIMIT = 120; // 消息撤回时间限制（秒为单位）
const MEMORY_CACHE_SIZE = 200; // 内存缓存最大条目数
const CACHE_VERSION = 1; // 缓存版本号，便于数据结构变更时定时清理旧的缓存
const DEFAULT_TIMEOUT = 30000; // 请求超时时间(ms为单位)

/**
 * 消息去重处理
 * @description 根据消息时间戳去重。如果存在相同时间戳的消息，优先保留被标记为 recalled 的消息
 * @param messages 原始消息列表
 * @returns 去重并按照时间排序后的消息列表
 */
function deduplicateMessages(messages: Message[]): Message[] {
    const messageMap = new Map<number, Message>();
    messages.forEach((msg) => {
        const existingMsg = messageMap.get(msg.time);
        // 如果当前消息是撤回的状态，或者Map中还没有该时间戳的消息，那便更新
        if (!existingMsg || msg.recalled === true) {
            messageMap.set(msg.time, msg);
        }
    });
    return Array.from(messageMap.values()).sort((a, b) => a.time - b.time);
}

/**
 * 解析原始消息对象转为数组
 * @description 将 Record 格式解析为 Message 数组
 * @param allMessages 键值对格式的消息对象， 其中键为消息内容的JSON字符串，而值为时间戳
 * @returns 解析后的消息数组
 */
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

/**
 * 聊天消息管理 Hook
 * @description 负责聊天室消息的获取、发送、撤回、缓存管理及自动轮询逻辑。
 *
 * @param chatId 聊天室 ID
 * @param username 当前用户名
 * @returns {Object} 聊天状态与操作方法
 *   - messages: 当前消息列表
 *   - isSending: 是否正在发送消息
 *   - sendMessage: 发送文本消息
 *   - sendFile: 发送文件/分享消息
 *   - recallMessage: 撤回消息
 */
export function useChatMessages(chatId: number, username: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isSending, setIsSending] = useState(false);

    // 云变量实例的引用
    const xRef = useRef<XESCloudValue | null>(null);

    // 消息缓存管理器的引用
    const cacheManagerRef = useRef(
        new MessageCacheManager({
            memoryMaxSize: MEMORY_CACHE_SIZE,
            localStorageExpiry: CACHE_EXPIRY,
            version: CACHE_VERSION,
        }),
    );

    // 轮询定时器
    const pollingTimeoutRef = useRef<number | null>(null);
    // 请求控制器，这里使用AbortController
    // https://developer.mozilla.org/en-US/docs/Web/API/AbortController
    const abortControllerRef = useRef<AbortController | null>(null);
    // 轮询状态标志
    const isPollingActiveRef = useRef(false);

    /**
     * 停止轮询
     * @description 取消当前轮询请求，清除定时器和信号量
     */
    const stopPolling = useCallback(() => {
        isPollingActiveRef.current = false;
        if (pollingTimeoutRef.current !== null) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
        }
        if (abortControllerRef.current !== null) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    /**
     * 获取聊天消息
     * @description 从云变量获取所有消息，先检查本地缓存，若不存在则从云变量获取。
     * @param signal 可选的 AbortSignal，用于取消请求
     */
    const fetchMessages = useCallback(
        async (signal?: AbortSignal): Promise<void> => {
            if (!xRef.current) return;
            if (signal?.aborted) return;

            try {
                const cacheManager = cacheManagerRef.current;
                let allMessages: Record<string, string> = {};

                // 尝试从缓存中读取
                const cachedMessages = cacheManager.get(chatId);
                if (cachedMessages) {
                    allMessages = cachedMessages;
                } else {
                    // 缓存未命中，那么从云端获取
                    allMessages = await xRef.current.getAllNum(DEFAULT_TIMEOUT, signal);
                    if (signal?.aborted) return;
                    cacheManager.set(chatId, allMessages);
                }

                setMessages(parseMessages(allMessages));
            } catch (e) {
                if (e instanceof DOMException && e.name === "AbortError") return;
                console.error("获取消息失败:", e);
                toast.error("获取消息失败，请检查连接");
            }
        },
        [chatId],
    );

    /**
     * 清理资源
     * @description 停止轮询并清除云变量缓存
     */
    const cleanupResources = useCallback(() => {
        stopPolling();
        if (xRef.current) {
            xRef.current.clearCache();
            xRef.current = null;
        }
    }, [stopPolling]);

    /**
     * 启动轮询
     * @description 初始化云变量实例，设置轮询状态为活跃，开始轮询消息更新。
     */
    const startPolling = useCallback(() => {
        cleanupResources();
        xRef.current = new XESCloudValue(String(chatId));
        isPollingActiveRef.current = true;

        const runFetch = () => fetchMessages();

        runFetch(); // 首次获取

        /**
         * 轮询
         * @description 定期从云变量获取最新消息，若有更新则更新本地缓存和消息状态。
         */
        const poll = async (): Promise<void> => {
            if (!isPollingActiveRef.current || !xRef.current) return;

            // 取消旧的
            abortControllerRef.current?.abort();
            abortControllerRef.current = new AbortController();
            const { signal } = abortControllerRef.current;

            try {
                const freshMessages = await xRef.current.getAllNum(DEFAULT_TIMEOUT, signal);
                if (signal.aborted) return;

                cacheManagerRef.current.set(chatId, freshMessages);

                runFetch();
            } catch (e) {
                if (e instanceof DOMException && e.name === "AbortError") return;
                console.error("更新缓存失败:", e);
            }

            // 只在活跃时设置下一次
            if (isPollingActiveRef.current) {
                pollingTimeoutRef.current = setTimeout(poll, POLLING_INTERVAL);
            }
        };

        pollingTimeoutRef.current = setTimeout(poll, POLLING_INTERVAL);

        return cleanupResources;
    }, [chatId, cleanupResources, fetchMessages]);

    // 当 chatId 变化时便重启轮询，卸载时停止
    useEffect(() => {
        startPolling();
        return () => {
            stopPolling();
        };
    }, [chatId, startPolling, stopPolling]);

    /**
     * 发送消息
     * @description 向发送一条消息，更新本地缓存和消息状态。
     * @param content 消息内容
     * @param quoteMessage 可选的引用消息，用于回复
     * @returns 发送成功返回 true，否则返回 false
     */
    const sendMessage = useCallback(
        async (content: string, quoteMessage?: Message): Promise<boolean> => {
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

                // 发送成功后刷新缓存并更新
                cacheManagerRef.current.clear(chatId);
                const freshMessages = await xRef.current.getAllNum(DEFAULT_TIMEOUT);
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
        },
        [chatId, username],
    );

    /**
     * 发送文件
     * @description 向云变量发送文件消息，更新本地缓存和消息状态。
     * @param file 要发送的文件元数据
     */
    const sendFile = useCallback(
        async (file: IFile) => {
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
                const freshMessages = await xRef.current.getAllNum(DEFAULT_TIMEOUT);
                cacheManagerRef.current.set(chatId, freshMessages);
                setMessages(parseMessages(freshMessages));
                toast.success("发送成功");
            } catch (e) {
                toast.error("发送失败");
                console.error("发送文件失败:", e);
            }
        },
        [chatId, username],
    );

    /**
     * 撤回消息
     * @description 撤回指定时间的消息，更新本地缓存和消息状态。
     * @param messageTime 要撤回的消息时间戳
     * @param isAdmin 是否为管理员操作，默认 false
     * @returns 撤回成功返回 true，否则返回 false
     */
    const recallMessage = useCallback(
        async (messageTime: number, isAdmin?: boolean): Promise<boolean> => {
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
            // 校验权限
            if (message.username !== currentUsername && isAdmin !== true) {
                toast.error("只能撤回自己发送的消息");
                return false;
            }

            const now = Date.now() / MS_TO_SECONDS;
            // 时间校验
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

                // 拉去数据确保同步
                cacheManagerRef.current.clear(chatId);
                const freshMessages = await x.getAllNum(DEFAULT_TIMEOUT);
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
        },
        [chatId, username, messages],
    );

    return {
        messages,
        isSending,
        sendMessage,
        sendFile,
        recallMessage,
    };
}
