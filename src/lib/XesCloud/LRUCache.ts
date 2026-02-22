import type { LRUCacheConfig } from "@/lib/types";

const DEFAULT_MAX_SIZE = 100;

export class LRUCache<K, V> {
    private cache: Map<K, V> = new Map();
    private keys: K[] = [];
    private config: LRUCacheConfig;

    constructor(config?: Partial<LRUCacheConfig>) {
        this.config = { maxSize: config?.maxSize ?? DEFAULT_MAX_SIZE };
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
