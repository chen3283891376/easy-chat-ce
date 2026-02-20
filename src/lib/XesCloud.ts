// Copyright (c) 2026 littlefish1145(https://github.com/littlefish1145), Inc.
// Licensed under the MIT license.

// This file is modified from http://75.127.89.226:8000/root/easy-chat-nextjs-refactor/-/blob/main/lib/xes-cloud.ts?ref_type=heads
const isBrowser = typeof window !== 'undefined';

interface LRUCacheConfig {
    maxSize: number;
}

class LRUCache<K, V> {
    private cache: Map<K, V> = new Map();
    private keys: K[] = [];
    private config: LRUCacheConfig;

    constructor(config?: Partial<LRUCacheConfig>) {
        this.config = { maxSize: config?.maxSize ?? 100 };
    }

    get(key: K): V | undefined {
        if (!this.cache.has(key)) {
            return undefined;
        }
        const index = this.keys.indexOf(key);
        if (index > -1) {
            this.keys.splice(index, 1);
            this.keys.push(key);
        }
        return this.cache.get(key);
    }

    set(key: K, value: V): void {
        if (this.cache.has(key)) {
            const index = this.keys.indexOf(key);
            if (index > -1) {
                this.keys.splice(index, 1);
            }
        } else {
            if (this.keys.length >= this.config.maxSize) {
                const oldestKey = this.keys.shift();
                if (oldestKey !== undefined) {
                    this.cache.delete(oldestKey);
                }
            }
        }
        this.cache.set(key, value);
        this.keys.push(key);
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }

    delete(key: K): boolean {
        const index = this.keys.indexOf(key);
        if (index > -1) {
            this.keys.splice(index, 1);
        }
        return this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
        this.keys = [];
    }
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    version: number;
}

interface MessageCacheConfig {
    memoryMaxSize: number;
    localStorageExpiry: number;
    version: number;
}

const DEFAULT_MESSAGE_CACHE_CONFIG: MessageCacheConfig = {
    memoryMaxSize: 100,
    localStorageExpiry: 5 * 60 * 1000,
    version: 1,
};

class MessageCacheManager {
    private memoryCache: LRUCache<string, Record<string, string>>;
    private config: MessageCacheConfig;
    private static readonly STORAGE_PREFIX = 'msg_cache_';

    constructor(config?: Partial<MessageCacheConfig>) {
        this.config = { ...DEFAULT_MESSAGE_CACHE_CONFIG, ...config };
        this.memoryCache = new LRUCache<string, Record<string, string>>({ maxSize: this.config.memoryMaxSize });
        if (isBrowser) {
            this.cleanupExpiredEntries();
        }
    }

    get(chatId: number): Record<string, string> | null {
        const memoryResult = this.getFromMemory(chatId);
        if (memoryResult !== null) {
            return memoryResult;
        }
        const localStorageResult = this.getFromLocalStorage(chatId);
        if (localStorageResult !== null) {
            this.setToMemory(chatId, localStorageResult);
            return localStorageResult;
        }
        return null;
    }

    set(chatId: number, messages: Record<string, string>): void {
        this.setToMemory(chatId, messages);
        this.setToLocalStorage(chatId, messages);
    }

    clear(chatId: number): void {
        this.memoryCache.delete(this.getCacheKey(chatId));
        if (!isBrowser) return;
        try {
            localStorage.removeItem(MessageCacheManager.STORAGE_PREFIX + chatId);
        } catch (e) {
            console.warn('Failed to clear localStorage:', e);
        }
    }

    clearAll(): void {
        this.memoryCache.clear();
        if (!isBrowser) return;
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(MessageCacheManager.STORAGE_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.warn('Failed to clear all localStorage entries:', e);
        }
    }

    private getFromMemory(chatId: number): Record<string, string> | null {
        const key = this.getCacheKey(chatId);
        if (this.memoryCache.has(key)) {
            return this.memoryCache.get(key) ?? null;
        }
        return null;
    }

    private getFromLocalStorage(chatId: number): Record<string, string> | null {
        if (!isBrowser) return null;
        try {
            const key = MessageCacheManager.STORAGE_PREFIX + chatId;
            const stored = localStorage.getItem(key);
            if (!stored) {
                return null;
            }
            const entry: CacheEntry<Record<string, string>> = JSON.parse(stored);
            if (entry.version !== this.config.version) {
                localStorage.removeItem(key);
                return null;
            }
            const now = Date.now();
            if (now - entry.timestamp > this.config.localStorageExpiry) {
                localStorage.removeItem(key);
                return null;
            }
            return entry.data;
        } catch (e) {
            console.warn('Failed to read from localStorage:', e);
            return null;
        }
    }

    private setToMemory(chatId: number, messages: Record<string, string>): void {
        const key = this.getCacheKey(chatId);
        this.memoryCache.set(key, messages);
    }

    private setToLocalStorage(chatId: number, messages: Record<string, string>): void {
        if (!isBrowser) return;
        try {
            const key = MessageCacheManager.STORAGE_PREFIX + chatId;
            const entry: CacheEntry<Record<string, string>> = {
                data: messages,
                timestamp: Date.now(),
                version: this.config.version,
            };
            localStorage.setItem(key, JSON.stringify(entry));
        } catch (e) {
            console.warn('Failed to write to localStorage:', e);
        }
    }

    private cleanupExpiredEntries(): void {
        if (!isBrowser) return;
        try {
            const now = Date.now();
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(MessageCacheManager.STORAGE_PREFIX)) {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        try {
                            const entry: CacheEntry<unknown> = JSON.parse(stored);
                            if (
                                entry.version !== this.config.version ||
                                now - entry.timestamp > this.config.localStorageExpiry
                            ) {
                                keysToRemove.push(key);
                            }
                        } catch {
                            keysToRemove.push(key);
                        }
                    }
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.warn('Failed to cleanup expired entries:', e);
        }
    }

    private getCacheKey(chatId: number): string {
        return String(chatId);
    }
}

class XESCloudValueData {
    projectId: string;
    constructor(projectId: string) {
        this.projectId = projectId;
    }
    handshakeData() {
        return {
            method: 'handshake',
            user: '16641346',
            project_id: this.projectId,
        };
    }
    uploadData(name: string, value: string) {
        return {
            method: 'set',
            user: '16641346',
            project_id: this.projectId,
            name: name,
            value: value,
        };
    }
}

const globalCache = new Map<string, { data: Record<string, string>; timestamp: number }>();
const pendingRequests = new Map<string, Promise<Record<string, string>>>();
const CACHE_TTL = 2000;

export class XESCloudValue {
    valueData: XESCloudValueData;
    private url: string;
    private projectId: string;
    private cacheManager: MessageCacheManager;

    constructor(projectId: string, cacheConfig?: Partial<MessageCacheConfig>) {
        this.projectId = projectId;
        this.valueData = new XESCloudValueData(projectId);
        this.url = 'wss://api.xueersi.com/codecloudvariable/ws:80';
        this.cacheManager = new MessageCacheManager(cacheConfig);
    }

    async sendNum(name: string, num: string, timeout: number = 30000): Promise<string> {
        if (typeof num !== 'string') {
            throw new Error('num must be a string');
        }
        if (num === '') {
            throw new Error('the num is null, please input a num');
        }

        globalCache.delete(this.projectId);

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.url);
            let completed = false;

            const timeoutId = window.setTimeout(() => {
                if (!completed) {
                    completed = true;
                    ws.close();
                    reject(new Error('连接超时'));
                }
            }, timeout);

            ws.onopen = () => {
                if (completed) {
                    ws.close();
                    return;
                }
                ws.send(JSON.stringify(this.valueData.uploadData(name, num)));
            };

            ws.onmessage = event => {
                if (completed) return;

                try {
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : {};
                    if (data.method === 'ack' && data.reply === 'OK') {
                        completed = true;
                        clearTimeout(timeoutId);
                        ws.close();
                        resolve('success');
                    }
                } catch (e) {
                    completed = true;
                    clearTimeout(timeoutId);
                    ws.close();
                    reject(e);
                }
            };

            ws.onerror = () => {
                if (!completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    reject(new Error('连接错误'));
                }
            };

            ws.onclose = () => {
                if (!completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    reject(new Error('连接关闭'));
                }
            };
        });
    }

    async getAllNum(timeout: number = 30000): Promise<Record<string, string>> {
        const cached = globalCache.get(this.projectId);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }

        const pending = pendingRequests.get(this.projectId);
        if (pending) {
            return pending;
        }

        const request = this.fetchOnceData(timeout)
            .then(data => {
                globalCache.set(this.projectId, { data, timestamp: Date.now() });
                pendingRequests.delete(this.projectId);
                return data;
            })
            .catch(error => {
                pendingRequests.delete(this.projectId);
                throw error;
            });

        pendingRequests.set(this.projectId, request);
        return request;
    }

    async fetchOnceData(timeout: number = 30000): Promise<Record<string, string>> {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.url);
            const result: Record<string, string> = {};
            let completed = false;

            const timeoutId = window.setTimeout(() => {
                if (!completed) {
                    completed = true;
                    ws.close();
                    resolve(result);
                }
            }, timeout);

            ws.onopen = () => {
                if (completed) {
                    ws.close();
                    return;
                }
                ws.send(JSON.stringify(this.valueData.handshakeData()));
            };

            ws.onmessage = event => {
                if (completed) return;

                try {
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : {};

                    if (data.method === 'ping') {
                        ws.send(JSON.stringify({ method: 'pong' }));
                        return;
                    }

                    if (data.method === 'ack') {
                        ws.send(JSON.stringify(this.valueData.handshakeData()));
                        return;
                    }

                    if (data.name !== undefined && data.value !== undefined) {
                        const name = String(data.name);
                        const value = String(data.value);

                        if (name in result) {
                            completed = true;
                            clearTimeout(timeoutId);
                            ws.close();
                            resolve(result);
                            return;
                        }
                        result[name] = value;
                        ws.send(JSON.stringify(this.valueData.handshakeData()));
                    }
                } catch (e) {
                    console.warn('解析消息错误', e);
                }
            };

            ws.onerror = () => {
                if (!completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    reject(new Error('连接错误'));
                }
            };

            ws.onclose = () => {
                if (!completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    resolve(result);
                }
            };
        });
    }

    async sendSomeNum(
        dic: Record<string, string>,
        timeout: number = 80000,
    ): Promise<Array<{ name: string; reply: string }>> {
        if (!dic || Object.keys(dic).length === 0) {
            throw new Error('the num is null, please input a num');
        }

        globalCache.delete(this.projectId);

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.url);
            const results: Array<{ name: string; reply: string }> = [];
            const entries = Object.entries(dic);
            let currentIndex = 0;
            let completed = false;

            const timeoutId = window.setTimeout(() => {
                if (!completed) {
                    completed = true;
                    ws.close();
                    resolve(results);
                }
            }, timeout);

            const sendNext = () => {
                if (currentIndex >= entries.length) {
                    completed = true;
                    clearTimeout(timeoutId);
                    ws.close();
                    resolve(results);
                    return;
                }

                const [name, num] = entries[currentIndex];
                ws.send(JSON.stringify(this.valueData.uploadData(name, num)));
            };

            ws.onopen = () => {
                if (completed) {
                    ws.close();
                    return;
                }
                sendNext();
            };

            ws.onmessage = event => {
                if (completed) return;

                try {
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : {};

                    if (data.method === 'ping') {
                        ws.send(JSON.stringify({ method: 'pong' }));
                        return;
                    }

                    if (data.method === 'ack') {
                        const [name] = entries[currentIndex];
                        if (data.reply === 'OK') {
                            results.push({ name, reply: 'success' });
                        } else {
                            results.push({ name, reply: 'fail' });
                        }
                        currentIndex++;
                        sendNext();
                    }
                } catch {
                    const [name] = entries[currentIndex];
                    results.push({ name, reply: 'fail' });
                    currentIndex++;
                    sendNext();
                }
            };

            ws.onerror = () => {
                if (!completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    reject(new Error('连接错误'));
                }
            };

            ws.onclose = () => {
                if (!completed) {
                    completed = true;
                    clearTimeout(timeoutId);
                    resolve(results);
                }
            };
        });
    }

    async findNum(name: string): Promise<{ name: string } | string> {
        try {
            const dic = await this.getAllNum();
            if (name in dic) {
                return { name: dic[name] };
            } else {
                return 'the num is not exist';
            }
        } catch (error) {
            console.error('Error finding number:', error);
            return 'the num is not exist';
        }
    }

    clearCache(): void {
        this.cacheManager.clear(parseInt(this.projectId, 10) || 0);
        globalCache.delete(this.projectId);
    }

    clearAllCache(): void {
        this.cacheManager.clearAll();
        globalCache.clear();
    }

    getProjectId(): string {
        return this.projectId;
    }
}

export { LRUCache, MessageCacheManager };
export type { Message, MessageCacheConfig, LRUCacheConfig, CacheEntry };

interface Message {
    id: string;
    name: string;
    value: string;
    timestamp?: number;
}
