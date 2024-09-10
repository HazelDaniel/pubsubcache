import { NextFunction, Request, Response } from "express";
import type { GlobalCacheInterface } from "../types.d.ts";
interface RoutePubsubCacheOptions {
    delimiter?: string;
}
declare class RoutePubsubCache {
    private subscribers;
    private groupSubscribers;
    private groupingCharacter;
    private globCharacter;
    private groupDelimiter;
    cache: GlobalCacheInterface;
    private context;
    private groupContext;
    constructor(opts?: RoutePubsubCacheOptions);
    isGenericRoute(url: string): boolean;
    subscribe(event: string, callback: Function): void;
    subscribeGroup(eventGroup: string, callback: Function): void;
    handleLonePublisher(event: string): void;
    callback(subscriber: Function | null, event: string): void;
    publish(event: string): void;
    broadcast(url: string): void;
    writeCache(url: string, data: any): Promise<void>;
    readCache(url: string): Promise<string | null>;
    read(url: string): Promise<string>;
}
declare class GlobalRouteCache {
    static delimiter: string;
    private static subHash;
    static deserializer(body: string): unknown;
    static serializer(body: unknown): string;
    static configureGlobalCache: (func: () => GlobalCacheInterface) => void;
    static configureGlobalCacheDeserializer: (func: (body: string) => unknown) => void;
    static configureGlobalCacheSerializer: (func: (body: unknown) => string) => void;
    static flushGlobalCache(): Promise<void>;
    static channel: RoutePubsubCache;
    static createCacheSubscriber(opts: {
        catchAll?: boolean;
    }): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    static createCachePublisher(opts: {
        catchAll?: boolean;
        cascade?: string[];
    }): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    static isGenericRoute(url: string): boolean;
    static post(url: string): void;
    static put(url: string): void;
    static delete(url: string): void;
    static pub(url: string): void;
    static sub(url: string): void;
    static get(url: string): Promise<string | undefined>;
    static subAll(url: string): void;
}
export { GlobalRouteCache, RoutePubsubCache };
//# sourceMappingURL=core.d.ts.map