import { CachedResponseType, GlobalCacheInterface } from "../types";
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