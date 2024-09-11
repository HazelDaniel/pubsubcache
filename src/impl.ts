import { CachedResponseType, GlobalCacheInterface } from "../types";
import { cacheClass } from "./cache.js";
import { dynamicMatch, handleTrailing, wait } from "./utils.js";
import { NextFunction, Request, Response, Send } from "express";

const CACHE_PREFIX = `pubsub_cache_:${new Date().getTime()}`;

interface RoutePubsubChannelOptions {
  delimiter?: string;
}

class RoutePubsubChannel {
  private subscribers: Map<string, Set<Function>>;
  private groupSubscribers: Map<string, Set<Function>>;
  private groupingCharacter: string;
  private globCharacter: string;
  private groupDelimiter: string;
  cache: GlobalCacheInterface;
  private context: Map<Function, Set<string>>;
  private groupContext: Map<Function, Set<string>>;

  constructor(opts?: RoutePubsubChannelOptions) {
    this.subscribers = new Map();
    this.groupSubscribers = new Map();
    this.groupingCharacter = ":";
    this.globCharacter = "*";
    this.groupDelimiter = opts?.delimiter || "/";

    this.cache = new cacheClass();
    this.context = new Map();
    this.groupContext = new Map();
  }

  isGenericRoute(url: string): boolean {
    return (
      url.indexOf(this.groupDelimiter + this.groupingCharacter) !== -1 ||
      url.indexOf(this.groupDelimiter + this.globCharacter) !== -1 ||
      url === this.globCharacter
    );
  }

  subscribe(event: string, callback: Function): void {
    if (!this.context.has(callback)) {
      this.context.set(callback, new Set([event]));
    }

    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)?.add(callback);
  }

  subscribeGroup(eventGroup: string, callback: Function): void {
    if (!this.groupContext.has(callback)) {
      this.groupContext.set(callback, new Set());
    }
    this.groupContext.get(callback)?.add(eventGroup);

    if (
      eventGroup.indexOf(this.groupingCharacter) !== -1 &&
      eventGroup.indexOf(this.globCharacter) !== -1
    ) {
      throw new Error(
        "you cannot mix grouping characters with glob characters when using event groups!"
      );
    }
    if (!this.groupSubscribers.has(eventGroup)) {
      this.groupSubscribers.set(eventGroup, new Set());
    }
    this.groupSubscribers.get(eventGroup)?.add(callback);
  }

  handleLonePublisher(event: string): void {
    // nobody subscribed to me explicitly but i am broadcasted nonetheless and i might match a group (or be a group)
    if (!this.isGenericRoute(event)) {
      // I AM JUST A CONCRETE EVENT
      let matchingParentEvents = [...this.groupSubscribers.keys()].filter(
        (e) => {
          const isMatch = dynamicMatch(
            event,
            e,
            this.groupDelimiter,
            this.groupingCharacter
          );
          return isMatch;
        }
      );
      const eventParentTreeMemo = new Set();
      for (const parentEvent of matchingParentEvents) {
        const matchingChildrenEvents2 = [...this.subscribers.entries()].filter(
          ([r, _2]) => {
            return dynamicMatch(
              r,
              parentEvent,
              this.groupDelimiter,
              this.groupingCharacter
            );
          }
        );

        if (matchingChildrenEvents2.length === 0) {
          [
            ...(this.groupSubscribers.get(parentEvent) as Set<Function>),
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
    } else {
      // I AM A GROUP EVENT
      let matchingChildrenEvents: Array<[string, Set<Function>]>;

      if (event === this.globCharacter) {
        // I AM A CATCH-ALL EVENT
        matchingChildrenEvents = [...this.subscribers.entries()];
      } else {
        matchingChildrenEvents = [...this.subscribers.entries()].filter(
          ([entry, _2]) => {
            const isMatch = dynamicMatch(
              entry,
              event,
              this.groupDelimiter,
              this.groupingCharacter
            );
            return isMatch;
          }
        );
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

  callback(subscriber: Function | null, event: string): void {
    if (
      !subscriber ||
      (!this.subscribers.has(event) && !this.groupSubscribers.has(event))
    ) {
      this.handleLonePublisher(event);
      return;
    }

    const ownerSet = this.groupContext.get(subscriber);
    let owner: string | undefined = undefined;
    if (ownerSet && ownerSet.size) [owner] = [...ownerSet];

    if (!owner) {
      if (!this.isGenericRoute(event)) {
        // THIS IS A CONCRETE EVENT
        subscriber({
          cache: this.cache,
          routeKeys: [event, ...(ownerSet || [])],
        });
        return;
      }
      console.warn(
        `event ${event} is not subscribed by any of the group context`
      );
      return;
    }

    // THIS IS A GROUP EVENT
    let matchingChildrenEvents = [...this.subscribers.keys()].filter((e) => {
      return dynamicMatch(
        e,
        owner,
        this.groupDelimiter,
        this.groupingCharacter
      );
    });

    subscriber({
      cache: this.cache,
      routeKeys: [...ownerSet!, ...matchingChildrenEvents],
    });
  }

  publish(event: string): void {
    const netSubscribers: Function[] = [];
    const netSubscribersMap = new Map<Function, string>();

    if (this.subscribers.has(event)) {
      [...this.subscribers.get(event)!].forEach((subscriber) => {
        if (!netSubscribersMap.has(subscriber)) {
          netSubscribers.push(subscriber);
          netSubscribersMap.set(subscriber, event);
        }
      });
    } else if (this.groupSubscribers.has(event)) {
      // GOING THROUGH SUBSCRIBERS FOR THIS GROUP EVENT
      [...this.groupSubscribers.get(event)!].forEach((s) => {
        if (!netSubscribersMap.has(s)) {
          netSubscribers.push(s);
          netSubscribersMap.set(s, event);
        }
      });

      // GOING THROUGH THE MATCHING CHILDREN FOR THIS GROUP EVENT
      [...this.subscribers.entries()].forEach(([key, matchingSubscribers]) => {
        if (
          dynamicMatch(
            key,
            event,
            this.groupDelimiter,
            this.groupingCharacter
          ) &&
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

    if (
      netSubscribers.length === 0 ||
      (netSubscribers.length === 1 && !!globsubs)
    ) {
      if (!this.isGenericRoute(event)) {
        console.warn(`event: ${event} has no subscribers attached to it`);
        return;
      }
      this.callback(null, event);
    }

    netSubscribers.forEach((subscriber) => {
      this.callback(subscriber, netSubscribersMap.get(subscriber)!);
    });
  }

  broadcast(url: string): void {
    this.publish(url);
  }

  async writeCache(url: string, data: any): Promise<void> {
    await this.cache.set(url, data);
  }

  async readCache(url: string): Promise<string | null> {
    return await this.cache.get(url);
  }

  async read(url: string): Promise<string> {
    let data: string;
    if (await this.cache.get(url)) {
      return "cached data";
    }
    await wait(0.3);
    data = "fresh data";
    await this.writeCache(url, data);
    return data;
  }
}

class GlobalRouteCache {
  static delimiter: string = "/";

  private static subHash: Map<string, number> = new Map();

  static configureGlobalCache: (func: () => GlobalCacheInterface) => void =
    async function <T extends GlobalCacheInterface>(func: () => T) {
      await GlobalRouteCache.channel.cache.cleanup();
      GlobalRouteCache.channel.cache = func();
    };

  static configureGlobalCacheDeserializer: (
    func: (body: string) => CachedResponseType
  ) => void = function (func) {
    GlobalRouteCache.channel.cache.deserializer = func;
  };

  static configureGlobalCacheSerializer: (
    func: (body: CachedResponseType) => string
  ) => void = function (func) {
    GlobalRouteCache.channel.cache.serializer = func;
  };

  static async flushGlobalCache() {
    this.subHash.clear(); // RESETTING THE SUBSCRIBERS LOOKUP
    await this.channel.cache.cleanup();
  }

  static channel: RoutePubsubChannel = new RoutePubsubChannel({
    delimiter: this.delimiter,
  });

  static createCacheSubscriber(opts: { catchAll?: boolean }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      let url = opts?.catchAll
        ? req.baseUrl + req.route.path
        : req.baseUrl + req.url;
      url = handleTrailing(url);

      // SUBSCRIBING LOGIC
      //NOTE: SHOULD ONLY SUBSCRIBE ONCE NO MATTER HOW MANY TIMES IT'S CALLED
      if (!this.subHash.has(url)) {
        this.sub(url);
        this.subHash.set(url, 1);
      }

      const cachedData = await this.channel.readCache(url);
      if (cachedData) {
        res.locals.cachedResponse = this.channel.cache.deserializer(cachedData);
      }

      const originalSend: Send = res.send;
      const newRes = function (this: Response, ...args: any[]) {
        const [body] = args;
        if (!res.locals.cachedResponse) {
          GlobalRouteCache.channel.writeCache(
            url,
            GlobalRouteCache.channel.cache.serializer({
              statusCode: res.statusCode,
              headers: res.getHeaders(),
              body: body,
            })
          ); // NO NEED TO BE AWAITED. WRITING BACK TO CACHE WILL HAPPEN ASYNC
        }
        return originalSend.apply(res, [body]);
      };

      res.send = newRes;

      next();
    };
  }

  static createCachePublisher(opts: {
    catchAll?: boolean;
    cascade?: string[];
  }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      let url = opts?.catchAll
        ? req.baseUrl + req.route.path
        : req.baseUrl + req.url;
      url = handleTrailing(url);

      res.on("finish", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          this.pub(url);
          if (opts?.cascade)
            for (let eventUrl of opts.cascade) {
              eventUrl = handleTrailing(eventUrl);
              this.pub(eventUrl);
            }
        }
      });

      next();
    };
  }

  static isGenericRoute(url: string): boolean {
    return this.channel.isGenericRoute(url);
  }

  static post(url: string): void {
    // ROUTE IMPLEMENTATION

    // MIDDLEWARE IMPLEMENTATION
    this.channel.broadcast(url);
  }

  static put(url: string): void {
    // ROUTE IMPLEMENTATION

    // MIDDLEWARE IMPLEMENTATION
    this.channel.broadcast(url);
  }

  static delete(url: string): void {
    // ROUTE IMPLEMENTATION

    // MIDDLEWARE IMPLEMENTATION
    this.channel.broadcast(url);
  }

  static pub(url: string): void {
    // MIDDLEWARE IMPLEMENTATION
    this.channel.broadcast(url);
  }

  static sub(url: string): void {
    // MIDDLEWARE IMPLEMENTATION
    if (this.isGenericRoute(url)) {
      this.subAll(url);
      return;
    }

    this.channel.subscribe(
      url,
      async ({
        cache,
        routeKeys,
      }: {
        cache: cacheClass;
        routeKeys: string[];
      }) => {
        const evictPromise = Promise.all(routeKeys.map(el => cache.evict(el)));
        await evictPromise;
      }
    );
  }

  static async get(url: string): Promise<string | undefined> {
    this.sub(url);
    return await this.channel.read(url);
  }

  static subAll(url: string): void {
    this.channel.subscribeGroup(
      url,
      async ({
        cache,
        routeKeys,
      }: {
        cache: cacheClass;
        routeKeys: string[];
      }) => {
        const evictPromise = Promise.all(routeKeys.map(el => cache.evict(el)));
        await evictPromise;
      }
    );
  }
}

export { GlobalRouteCache, RoutePubsubChannel };