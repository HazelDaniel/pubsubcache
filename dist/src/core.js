var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
import { dynamicMatch, handleTrailing, wait } from "./utils.js";
import { cacheClass } from "./cache.js";
const CACHE_PREFIX = `pubsub_cache_:${new Date().getTime()}`;
class RoutePubsubCache {
    constructor(opts) {
        this.subscribers = new Map();
        this.groupSubscribers = new Map();
        this.groupingCharacter = ":";
        this.globCharacter = "*";
        this.groupDelimiter = (opts === null || opts === void 0 ? void 0 : opts.delimiter) || "/";
        this.cache = new cacheClass();
        this.context = new Map();
        this.groupContext = new Map();
    }
    isGenericRoute(url) {
        return (url.indexOf(this.groupDelimiter + this.groupingCharacter) !== -1 ||
            url.indexOf(this.groupDelimiter + this.globCharacter) !== -1 ||
            url === this.globCharacter);
    }
    subscribe(event, callback) {
        var _b;
        if (!this.context.has(callback)) {
            this.context.set(callback, new Set([event]));
        }
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, new Set());
        }
        (_b = this.subscribers.get(event)) === null || _b === void 0 ? void 0 : _b.add(callback);
    }
    subscribeGroup(eventGroup, callback) {
        var _b, _c;
        if (!this.groupContext.has(callback)) {
            this.groupContext.set(callback, new Set());
        }
        (_b = this.groupContext.get(callback)) === null || _b === void 0 ? void 0 : _b.add(eventGroup);
        if (eventGroup.indexOf(this.groupingCharacter) !== -1 &&
            eventGroup.indexOf(this.globCharacter) !== -1) {
            throw new Error("you cannot mix grouping characters with glob characters when using event groups!");
        }
        if (!this.groupSubscribers.has(eventGroup)) {
            this.groupSubscribers.set(eventGroup, new Set());
        }
        (_c = this.groupSubscribers.get(eventGroup)) === null || _c === void 0 ? void 0 : _c.add(callback);
    }
    handleLonePublisher(event) {
        // nobody subscribed to me explicitly but i am broadcasted nonetheless and i might match a group (or be a group)
        if (!this.isGenericRoute(event)) {
            // I AM JUST A CONCRETE EVENT
            let matchingParentEvents = [...this.groupSubscribers.keys()].filter((e) => {
                const isMatch = dynamicMatch(event, e, this.groupDelimiter, this.groupingCharacter);
                return isMatch;
            });
            const eventParentTreeMemo = new Set();
            for (const parentEvent of matchingParentEvents) {
                const matchingChildrenEvents2 = [...this.subscribers.entries()].filter(([r, _2]) => {
                    return dynamicMatch(r, parentEvent, this.groupDelimiter, this.groupingCharacter);
                });
                if (matchingChildrenEvents2.length === 0) {
                    [
                        ...this.groupSubscribers.get(parentEvent),
                    ].forEach((subscriber) => {
                        subscriber({
                            cache: this.cache,
                            routeKeys: [parentEvent, event],
                        });
                    });
                }
                for (const [route, subscriberList] of matchingChildrenEvents2) {
                    if (!eventParentTreeMemo.has(route)) {
                        subscriberList.forEach((subscriber) => {
                            subscriber({
                                cache: this.cache,
                                routeKeys: eventParentTreeMemo.has(event)
                                    ? [route]
                                    : [route, event],
                            });
                        });
                    }
                    eventParentTreeMemo.add(event);
                    eventParentTreeMemo.add(route);
                }
            }
        }
        else {
            // I AM A GROUP EVENT
            let matchingChildrenEvents;
            if (event === this.globCharacter) {
                // I AM A CATCH-ALL EVENT
                matchingChildrenEvents = [...this.subscribers.entries()];
            }
            else {
                matchingChildrenEvents = [...this.subscribers.entries()].filter(([entry, _2]) => {
                    const isMatch = dynamicMatch(entry, event, this.groupDelimiter, this.groupingCharacter);
                    return isMatch;
                });
            }
            for (const [childEvent, subscriberList] of matchingChildrenEvents) {
                [...subscriberList].forEach((subscriber) => {
                    subscriber({
                        cache: this.cache,
                        routeKeys: [event, childEvent],
                    });
                });
            }
            if (matchingChildrenEvents.length === 0) {
                console.warn(`group event: ${event} has no subscribers attached to it`);
                return;
            }
        }
        return;
    }
    callback(subscriber, event) {
        if (!subscriber ||
            (!this.subscribers.has(event) && !this.groupSubscribers.has(event))) {
            this.handleLonePublisher(event);
            return;
        }
        const ownerSet = this.groupContext.get(subscriber);
        let owner = undefined;
        if (ownerSet && ownerSet.size)
            [owner] = [...ownerSet];
        if (!owner) {
            if (!this.isGenericRoute(event)) {
                // THIS IS A CONCRETE EVENT
                subscriber({
                    cache: this.cache,
                    routeKeys: [event, ...(ownerSet || [])],
                });
                return;
            }
            console.warn(`event ${event} is not subscribed by any of the group context`);
            return;
        }
        // THIS IS A GROUP EVENT
        let matchingChildrenEvents = [...this.subscribers.keys()].filter((e) => {
            return dynamicMatch(e, owner, this.groupDelimiter, this.groupingCharacter);
        });
        subscriber({
            cache: this.cache,
            routeKeys: [...ownerSet, ...matchingChildrenEvents],
        });
    }
    publish(event) {
        const netSubscribers = [];
        const netSubscribersMap = new Map();
        if (this.subscribers.has(event)) {
            [...this.subscribers.get(event)].forEach((subscriber) => {
                if (!netSubscribersMap.has(subscriber)) {
                    netSubscribers.push(subscriber);
                    netSubscribersMap.set(subscriber, event);
                }
            });
        }
        else if (this.groupSubscribers.has(event)) {
            // GOING THROUGH SUBSCRIBERS FOR THIS GROUP EVENT
            [...this.groupSubscribers.get(event)].forEach((s) => {
                if (!netSubscribersMap.has(s)) {
                    netSubscribers.push(s);
                    netSubscribersMap.set(s, event);
                }
            });
            // GOING THROUGH THE MATCHING CHILDREN FOR THIS GROUP EVENT
            [...this.subscribers.entries()].forEach(([key, matchingSubscribers]) => {
                if (dynamicMatch(key, event, this.groupDelimiter, this.groupingCharacter) &&
                    key !== this.globCharacter &&
                    key !== event // THIS GUARANTEES THAT WE'LL BE GOING THROUGH CONCRETE CHILDREN OF THE CURRENT EVENT
                ) {
                    [...matchingSubscribers].forEach((item) => {
                        if (!netSubscribersMap.has(item)) {
                            netSubscribers.push(item);
                            netSubscribersMap.set(item, key);
                        }
                    });
                }
            });
        }
        const globsubs = this.groupSubscribers.get(this.globCharacter);
        if (globsubs) {
            [...globsubs].forEach((subscriber) => {
                if (!netSubscribersMap.has(subscriber)) {
                    netSubscribers.push(subscriber);
                    netSubscribersMap.set(subscriber, this.globCharacter);
                }
            });
        }
        if (netSubscribers.length === 0 ||
            (netSubscribers.length === 1 && !!globsubs)) {
            if (!this.isGenericRoute(event)) {
                console.warn(`event: ${event} has no subscribers attached to it`);
                return;
            }
            this.callback(null, event);
        }
        netSubscribers.forEach((subscriber) => {
            this.callback(subscriber, netSubscribersMap.get(subscriber));
        });
    }
    broadcast(url) {
        this.publish(url);
    }
    writeCache(url, data) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.cache.set(url, data);
        });
    }
    readCache(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.cache.get(url);
        });
    }
    read(url) {
        return __awaiter(this, void 0, void 0, function* () {
            let data;
            if (yield this.cache.get(url)) {
                return "cached data";
            }
            yield wait(0.3);
            data = "fresh data";
            yield this.writeCache(url, data);
            return data;
        });
    }
}
class GlobalRouteCache {
    static deserializer(body) {
        return body;
    }
    static serializer(body) {
        return body;
    }
    static flushGlobalCache() {
        return __awaiter(this, void 0, void 0, function* () {
            this.subHash.clear(); // RESETTING THE SUBSCRIBERS LOOKUP
            yield this.channel.cache.cleanup();
        });
    }
    static createCacheSubscriber(opts) {
        return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            let url = (opts === null || opts === void 0 ? void 0 : opts.catchAll) ? req.baseUrl + req.route.path : req.baseUrl + req.url;
            url = handleTrailing(url);
            // SUBSCRIBING LOGIC
            //NOTE: SHOULD ONLY SUBSCRIBE ONCE NO MATTER HOW MANY TIMES IT'S CALLED
            if (!this.subHash.has(url)) {
                // console.log("registering subscriber to event : ", url);
                this.sub(url);
                this.subHash.set(url, 1);
            }
            const cachedData = yield this.channel.readCache(url);
            if (cachedData) {
                res.locals.cachedResponse = this.deserializer(cachedData);
            }
            const originalSend = res.send;
            const newRes = function (...args) {
                const [body] = args;
                if (!res.locals.cachedResponse) {
                    _a.channel.writeCache(url, _a.serializer({
                        statusCode: res.statusCode,
                        headers: res.getHeaders(),
                        body: body,
                    })); // NO NEED TO BE AWAITED. WRITING BACK TO CACHE WILL HAPPEN ASYNC
                }
                return originalSend.apply(res, [body]);
            };
            res.send = newRes;
            next();
        });
    }
    static createCachePublisher(opts) {
        return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            let url = (opts === null || opts === void 0 ? void 0 : opts.catchAll) ? req.baseUrl + req.route.path : req.baseUrl + req.url;
            url = handleTrailing(url);
            res.on("finish", () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    this.pub(url);
                    if (opts === null || opts === void 0 ? void 0 : opts.cascade)
                        for (let eventUrl of opts.cascade) {
                            eventUrl = handleTrailing(eventUrl);
                            this.pub(eventUrl);
                        }
                }
            });
            next();
        });
    }
    static isGenericRoute(url) {
        return this.channel.isGenericRoute(url);
    }
    static post(url) {
        // ROUTE IMPLEMENTATION
        // MIDDLEWARE IMPLEMENTATION
        this.channel.broadcast(url);
    }
    static put(url) {
        // ROUTE IMPLEMENTATION
        // MIDDLEWARE IMPLEMENTATION
        this.channel.broadcast(url);
    }
    static delete(url) {
        // ROUTE IMPLEMENTATION
        // MIDDLEWARE IMPLEMENTATION
        this.channel.broadcast(url);
    }
    static pub(url) {
        // MIDDLEWARE IMPLEMENTATION
        this.channel.broadcast(url);
    }
    static sub(url) {
        // MIDDLEWARE IMPLEMENTATION
        if (this.isGenericRoute(url)) {
            this.subAll(url);
            return;
        }
        this.channel.subscribe(url, (_b) => __awaiter(this, [_b], void 0, function* ({ cache, routeKeys, }) {
            for (const key of routeKeys) {
                yield cache.evict(key);
            }
        }));
    }
    static get(url) {
        return __awaiter(this, void 0, void 0, function* () {
            this.sub(url);
            return yield this.channel.read(url);
        });
    }
    static subAll(url) {
        this.channel.subscribeGroup(url, (_b) => __awaiter(this, [_b], void 0, function* ({ cache, routeKeys, }) {
            for (const key of routeKeys) {
                if (!this.isGenericRoute(key)) {
                    yield cache.evict(key);
                }
            }
        }));
    }
}
_a = GlobalRouteCache;
GlobalRouteCache.delimiter = "/";
GlobalRouteCache.subHash = new Map();
GlobalRouteCache.configureGlobalCache = function (func) {
    return __awaiter(this, void 0, void 0, function* () {
        yield _a.channel.cache.cleanup();
        _a.channel.cache = func();
    });
};
GlobalRouteCache.configureGlobalCacheDeserializer = function (func) {
    _a.deserializer = func;
};
GlobalRouteCache.configureGlobalCacheSerializer = function (func) {
    _a.serializer = func;
};
GlobalRouteCache.channel = new RoutePubsubCache({
    delimiter: _a.delimiter,
});
export { GlobalRouteCache, RoutePubsubCache };
