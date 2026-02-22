export const isBrowser = typeof window !== "undefined";

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_LOCAL_STORAGE_EXPIRY = 5 * 60 * 1000;
const DEFAULT_CACHE_TTL = 2000;

export const DEFAULT_MESSAGE_CACHE_CONFIG = {
    memoryMaxSize: DEFAULT_MAX_SIZE,
    localStorageExpiry: DEFAULT_LOCAL_STORAGE_EXPIRY,
    version: 1,
};

export const CACHE_TTL = DEFAULT_CACHE_TTL;
