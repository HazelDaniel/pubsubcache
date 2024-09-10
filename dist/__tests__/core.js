var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { RoutePubsubCache, GlobalRouteCache } from "../src/core.js";
import { cacheClass } from "../src/cache.js";
// let cache = new RoutePubsubCache();
describe("RoutePubsubCache", () => {
    let cache;
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        jest.clearAllMocks();
        GlobalRouteCache.configureGlobalCache(() => new cacheClass());
        cache = new RoutePubsubCache();
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // WILL ALWAYS STAY THE SAME. THE CACHE IS NOT BEING AFFECTED WHEN YOU ARE SUBSCRIBING AND PUBLISHING
        console.log("the internal cache is ", GlobalRouteCache.channel.cache);
    }));
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        // UNLESS YOU ARE TAMPERING EXPLICITLY WITH THE INTERNAL CACHE, SO:
        yield GlobalRouteCache.flushGlobalCache();
    }));
    test("subscribe and publish", () => {
        let totalSubTriggered = 0;
        cache.subscribeGroup("/*", () => {
            // console.log(`///*`);
            totalSubTriggered++;
        });
        cache.subscribeGroup("/users/:user_id", ({ cache, routeKeys }) => {
            // console.log(`///users/:user_id`);
            totalSubTriggered++;
        });
        cache.subscribe("/users/123", ({ cache, routeKeys }) => {
            // console.log(`///users/123`);
            totalSubTriggered++;
        });
        cache.subscribe("/users/124", ({ cache, routeKeys }) => {
            // console.log(`///users/124`);
            totalSubTriggered++;
        });
        cache.subscribe("/users/124/news/0", () => {
            // console.log(`///users/124/news/0`);
            totalSubTriggered++;
        });
        cache.publish("/users/123");
        cache.publish("/users/:user_id/news/:news_id");
        cache.publish("/users/*/news/*");
        cache.publish("/users/:user_id");
        cache.publish("/*");
        cache.publish("*");
        expect(totalSubTriggered).toBe(13);
        totalSubTriggered = 0;
        cache.publish("/users/:user_id");
        cache.publish("/users/:user_id");
        expect(totalSubTriggered).toBe(6);
        totalSubTriggered = 0;
        cache.publish("/users/:user_id");
        cache.publish("/users/:user_id");
        cache.publish("/users/:user_id");
        cache.publish("/users/129"); // AN EVENT THAT DOESN'T EXIST (AND IS NOT A GROUP EVENT) WILL NOT TRIGGER THE CATCH-ALL SUBSCRIBER
        cache.publish("/port/*"); // A GROUP EVENT THAT DOESN'T MATCH ANY SUBSCRIBER WILL NOT TRIGGER THE CATCH-ALL SUBSCRIBER
        expect(totalSubTriggered).toBe(9);
        totalSubTriggered = 0;
        cache.publish("/users/123");
        cache.publish("/users/:user_id/news/:news_id");
        cache.publish("/users/*/news/*");
        cache.publish("/users/:user_id");
        cache.publish("/levels/2"); // AN EVENT THAT DOESN'T EXIST (AND IS NOT A GROUP EVENT) WILL NOT TRIGGER THE CATCH-ALL SUBSCRIBER
        cache.publish("/*");
        cache.publish("*");
        expect(totalSubTriggered).toBe(13);
        totalSubTriggered = 0;
        cache.subscribe("/users", () => {
            // console.log(`//*`);
            totalSubTriggered++;
        });
        cache.publish("/users");
        expect(totalSubTriggered).toBe(1);
    });
    test("subscribeGroup and publish", () => {
        const mockCallback = jest.fn();
        cache.subscribeGroup("/users/:id", mockCallback);
        cache.publish("/users/:id");
        expect(mockCallback).toHaveBeenCalledTimes(1);
    });
    test("write and read", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const data = yield cache.read("/users/123");
        expect(data).toEqual("fresh data");
        expect(data).toBe((_a = cache.cache.data) === null || _a === void 0 ? void 0 : _a.get("/users/123"));
    }));
    test("eviction on publish", () => __awaiter(void 0, void 0, void 0, function* () {
        const mockCallback = jest.fn(({ cache, routeKeys }) => {
            console.log("subscriber ran");
            routeKeys.forEach((key) => {
                cache.evict(key);
            });
        });
        cache.subscribe("/users/123", mockCallback);
        yield cache.writeCache("/users/123", "user data");
        cache.publish("/users/123");
        expect(yield cache.cache.get("/users/123")).toBeUndefined();
    }));
});
describe("GlobalRouteCache", () => {
    beforeEach(() => {
        // IF YOU ARE CONFIGURING A NEW ROUTE CACHE FOR EVERY TEST
        jest.clearAllMocks();
        GlobalRouteCache.configureGlobalCache(() => new cacheClass());
    });
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        // THEN YOU SHOULD CLEAN IT UP AFTER EVERY TEST
        yield GlobalRouteCache.flushGlobalCache();
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        console.log("the internal cache is ", GlobalRouteCache.channel.cache);
    }));
    test("get and post", () => __awaiter(void 0, void 0, void 0, function* () {
        const spy = jest.spyOn(GlobalRouteCache.channel, "broadcast");
        yield GlobalRouteCache.get("/users/123");
        GlobalRouteCache.post("/users/123");
        expect(spy).toHaveBeenCalledWith("/users/123");
    }));
    test("getAll with generic route", () => __awaiter(void 0, void 0, void 0, function* () {
        const spy = jest.spyOn(GlobalRouteCache.channel, "subscribeGroup");
        yield GlobalRouteCache.get("/users/:id");
        expect(spy).toHaveBeenCalledWith("/users/:id", expect.any(Function));
    }));
    test("cache flow test", () => __awaiter(void 0, void 0, void 0, function* () {
        //cache miss
        const data1 = yield GlobalRouteCache.get("/users/123");
        expect(data1).toBe("fresh data");
        //cache hit
        const data1b = yield GlobalRouteCache.get("/users/123");
        expect(data1b).toBe("cached data");
        //cache eviction
        GlobalRouteCache.post("/users/123");
        //cache miss
        let data2 = yield GlobalRouteCache.channel.read("/users/123");
        expect(data2).toBe("fresh data");
    }));
});
