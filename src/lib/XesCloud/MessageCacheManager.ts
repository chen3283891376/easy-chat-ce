import { LRUCache } from "./LRUCache";
import type { MessageCacheConfig, CacheEntry } from "@/lib/types";
import { isBrowser, DEFAULT_MESSAGE_CACHE_CONFIG } from "./utils";

export class MessageCacheManager {
    private memoryCache: LRUCache<string, Record<string, string>>;
    private config: MessageCacheConfig;
    private static readonly STORAGE_PREFIX = "msg_cache_";

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
            localStorage.removeItem(MessageCacheManager.STORAGE_PREFIX + String(chatId));
        } catch (e) {
            console.warn("Failed to clear localStorage:", e);
        }
    }

    clearAll(): void {
        this.memoryCache.clear();
        if (!isBrowser) return;
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key !== null && key.length > 0 && key.startsWith(MessageCacheManager.STORAGE_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach((key) => {
                localStorage.removeItem(key);
            });
        } catch (e) {
            console.warn("Failed to clear all localStorage entries:", e);
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
            const key = MessageCacheManager.STORAGE_PREFIX + String(chatId);
            const stored = localStorage.getItem(key);
            if (stored === null || stored.length === 0) {
                return null;
            }
            const entry: CacheEntry<Record<string, string>> = JSON.parse(stored) as CacheEntry<Record<string, string>>;
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
            console.warn("Failed to read from localStorage:", e);
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
            const key = MessageCacheManager.STORAGE_PREFIX + String(chatId);
            const entry: CacheEntry<Record<string, string>> = {
                data: messages,
                timestamp: Date.now(),
                version: this.config.version,
            };
            localStorage.setItem(key, JSON.stringify(entry));
        } catch (e) {
            console.warn("Failed to write to localStorage:", e);
        }
    }

    private cleanupExpiredEntries(): void {
        if (!isBrowser) return;
        try {
            const now = Date.now();
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key !== null && key.length > 0 && key.startsWith(MessageCacheManager.STORAGE_PREFIX)) {
                    const stored = localStorage.getItem(key);
                    if (stored !== null && stored.length > 0) {
                        try {
                            const entry: CacheEntry<unknown> = JSON.parse(stored) as CacheEntry<unknown>;
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
            keysToRemove.forEach((key) => {
                localStorage.removeItem(key);
            });
        } catch (e) {
            console.warn("Failed to cleanup expired entries:", e);
        }
    }

    private getCacheKey(chatId: number): string {
        return String(chatId);
    }
}
