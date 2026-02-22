export interface LRUCacheConfig {
    maxSize: number;
}

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    version: number;
}

export interface MessageCacheConfig {
    memoryMaxSize: number;
    localStorageExpiry: number;
    version: number;
}

export interface WsMessage {
    method?: string;
    reply?: string;
    name?: string;
    value?: string;
    user?: string;
    project_id?: string;
}

export interface WriteTask<T> {
    task: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: Error) => void;
}

export interface WriteResolver {
    resolve: (event: MessageEvent) => void;
    reject: (reason: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
}

export type * from "./chat";
