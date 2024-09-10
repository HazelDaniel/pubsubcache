import { RoutePubsubCache, GlobalRouteCache } from "../src/core.js";
import { cacheClass } from "../src/cache.js";

// let cache = new RoutePubsubCache();
describe("RoutePubsubCache", () => {
  let cache: RoutePubsubCache;

  beforeEach(async () => {
    jest.clearAllMocks();
    GlobalRouteCache.configureGlobalCache(() => new cacheClass());
    cache = new RoutePubsubCache();
  });

  afterAll(async () => {
    // WILL ALWAYS STAY THE SAME. THE CACHE IS NOT BEING AFFECTED WHEN YOU ARE SUBSCRIBING AND PUBLISHING
    console.log("the internal cache is ", GlobalRouteCache.channel.cache);
  });

  afterEach(async () => {
    // UNLESS YOU ARE TAMPERING EXPLICITLY WITH THE INTERNAL CACHE, SO:
    await GlobalRouteCache.flushGlobalCache();
  });

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

  test("write and read", async () => {
    const data = await cache.read("/users/123");
    expect(data).toEqual("fresh data");
    expect(data).toBe(cache.cache.data?.get("/users/123"));
  });

  test("eviction on publish", async () => {
    const mockCallback = jest.fn(({ cache, routeKeys }) => {
      console.log("subscriber ran");
      routeKeys.forEach((key: string) => {
        cache.evict(key);
      });
    });

    cache.subscribe("/users/123", mockCallback);
    await cache.writeCache("/users/123", "user data");
    cache.publish("/users/123");
    expect(await cache.cache.get("/users/123")).toBeUndefined();
  });
});

describe("GlobalRouteCache", () => {
  beforeEach(() => {
    // IF YOU ARE CONFIGURING A NEW ROUTE CACHE FOR EVERY TEST
    jest.clearAllMocks();
    GlobalRouteCache.configureGlobalCache(() => new cacheClass());
  });

  afterEach(async () => {
    // THEN YOU SHOULD CLEAN IT UP AFTER EVERY TEST
    await GlobalRouteCache.flushGlobalCache();
  });

  afterAll(async () => {
    console.log("the internal cache is ", GlobalRouteCache.channel.cache);
  });

  test("get and post", async () => {
    const spy = jest.spyOn(GlobalRouteCache.channel, "broadcast");
    await GlobalRouteCache.get("/users/123");
    GlobalRouteCache.post("/users/123");
    expect(spy).toHaveBeenCalledWith("/users/123");
  });

  test("getAll with generic route", async () => {
    const spy = jest.spyOn(GlobalRouteCache.channel, "subscribeGroup");
    await GlobalRouteCache.get("/users/:id");
    expect(spy).toHaveBeenCalledWith("/users/:id", expect.any(Function));
  });

  test("cache flow test", async () => {
    //cache miss
    const data1 = await GlobalRouteCache.get("/users/123");
    expect(data1).toBe("fresh data");

    //cache hit
    const data1b = await GlobalRouteCache.get("/users/123");
    expect(data1b).toBe("cached data");

    //cache eviction
    GlobalRouteCache.post("/users/123");

    //cache miss
    let data2 = await GlobalRouteCache.channel.read("/users/123");
    expect(data2).toBe("fresh data");
  });
});
