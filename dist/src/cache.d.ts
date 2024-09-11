import type { CachedResponseType, GlobalCacheInterface } from "../types";
import type { RedisClientType } from "redis";
export declare class RedisCacheClass implements GlobalCacheInterface {
    client: RedisClientType;
    constructor();
    deserializer(body: string): CachedResponseType;
    serializer(body: CachedResponseType): string;
    get(key: string): Promise<string | null>;
    set(key: string, value: any): Promise<void>;
    evict(key: string): Promise<void>;
    cleanup(): Promise<void>;
}
export declare class cacheClass implements GlobalCacheInterface {
    data: Map<string, any>;
    constructor();
    deserializer(body: string): CachedResponseType;
    serializer(body: CachedResponseType): string;
    evict(key: string): Promise<void>;
    set(key: string, value: any): Promise<void>;
    get(key: string): Promise<any | undefined>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=cache.d.ts.map