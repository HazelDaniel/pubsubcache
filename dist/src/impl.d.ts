import { CachedResponseType, GlobalCacheInterface } from "../types";
import { NextFunction, Request, Response } from "express";
interface RoutePubsubChannelOptions {
    delimiter?: string;
}
declare class RoutePubsubChannel {
    private subscribers;
    private groupSubscribers;
    private groupingCharacter;
    private globCharacter;
    private groupDelimiter;
    cache: GlobalCacheInterface;
    private context;
    private groupContext;
    constructor(opts?: RoutePubsubChannelOptions);
    isGenericRoute(url: string): boolean;
    subscribe(event: string, callback: Function): void;
    subscribeGroup(eventGroup: string, callback: Function): void;
    handleLonePublisher(event: string): void;
    callback(subscriber: Function | null, event: string, opts?: {
        freeze?: boolean;
    }): void;
    publish(event: string, freeze?: boolean): void;
    broadcast(url: string, freeze?: boolean): void;
    writeCache(url: string, data: any): Promise<void>;
    readCache(url: string): Promise<string | null>;
    read(url: string): Promise<string>;
}
declare class GlobalRouteCache {
    static delimiter: string;
    private static subHash;
    static configureGlobalCache: (func: () => GlobalCacheInterface) => void;
    static configureGlobalCacheDeserializer: (func: (body: string) => CachedResponseType) => void;
    static configureGlobalCacheSerializer: (func: (body: CachedResponseType) => string) => void;
    static flushGlobalCache(): Promise<void>;
    static channel: RoutePubsubChannel;
    static createCacheSubscriber(opts?: {
        catchAll?: boolean;
    }): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    static createCachePublisher(opts?: {
        catchAll?: boolean;
        cascade?: string[];
        freeze?: boolean;
    }): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    static isGenericRoute(url: string): boolean;
    static post(url: string): void;
    static put(url: string): void;
    static delete(url: string): void;
    static pub(url: string, freeze?: boolean): void;
    static sub(url: string): void;
    static get(url: string): Promise<string | undefined>;
    static subAll(url: string): void;
}
export { GlobalRouteCache, RoutePubsubChannel };
//# sourceMappingURL=impl.d.ts.map