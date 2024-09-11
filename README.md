# Module Overview

**Name**: `GlobalRouteCache`  
**Description**: This class provides all the required APIs to work with the library. you don't need to import additional exports.

**Import Syntax**:

```js
import { GlobalRouteCache } from "express-pubsubcache";
// or
import GlobalRouteCache from "express-pubsubcache";
```

---

<br/>

## Methods and interfaces

<br/>

### 1. **Name**

`ConfigureGlobalCache`

### 2. **Description**

By default, the library uses a javascript map to hold the response cache data. However, It fully supports any storage type of your choice for caching (SQLite, Memcached, Redis, etc.). All you have to do is write an adapter that implements this interface:
<br/>

```js
export type CachedResponseType = {body?: unknown; statusCode?: number; headers?: {} & Express.Locals };

export interface GlobalCacheInterface {
  evict: (key: string) => Promise<void>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: any) => Promise<void>;
  data?: Map<string, any>;
  deserializer: (body: string) => CachedResponseType;
  serializer: (opts: CachedResponseType) => string;
  cleanup: () => Promise<void>;
}
```

### 3. **Arguments**

- **func**: `() => GlobalCacheInterface` - A function that returns an implementation of the `GlobalCacheInterface` type, which will be used as the response cache adapter

### 4. **Example**

```js
// implement the interface
export class cacheClass implements GlobalCacheInterface {
  data: Map<string, any>;

  constructor() {
    this.data = new Map();
  }

  async evict(key: string): Promise<void> {
    if (!this.data.has(key)) return;
    this.data.delete(key);
  }

  async set(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }

  async get(key: string): Promise<any | undefined> {
    return this.data.get(key);
  }

  async cleanup(): Promise<void> {
    this.data.clear();
  }
}

// then configure to use the implementation
GlobalRouteCache.configureGlobalCache(() => new cacheClass());
```

---

<br/>

### 1. **Name**

`configureGlobalCacheSerializer`

### 2. **Description**

If you want to override the default behavior of the serializing logic of the response cache, you can provide your own configuration.

> <b>NOTE</b> that this should be called at the top level of the scope of your application. Otherwise, the default will be used in scopes where your initialization is not visible.
> <br/>

### 3. **Arguments**

- **func**: `(body: CachedResponseType) => string` - A function that takes in an input of type [CachedResponseType](#CachedResponseType) and returns a string.

### 4. **Example**

```js
// at the top level
GlobalRouteCache.configureGlobalCacheSerializer((res) => JSON.stringify(res));

//...  rest of your application
```

---

<br/>

### 1. **Name**

`configureGlobalCacheDeserializer`

### 2. **Description**

If you want to override the default behavior of the deserializing logic of the response cache, you can provide your own configuration.

> <b>NOTE</b> that this should be called at the top level of the scope of your application. Otherwise, the default will be used in scopes where your initialization is not visible.
> <br/>

### 3. **Arguments**

- **func**: `(body: string) => CachedResponseType` - A function that takes in a string and returns an object of type [CachedResponseType](#CachedResponseType).

### 4. **Example**

```js
// at the top level
GlobalRouteCache.configureGlobalCacheDeserializer((res) => JSON.parse(res));

//...  rest of your application
```

---

<br/>

### 1. **Name**

`flushGlobalCache`

### 2. **Description**

This should be called whenever you want to do a cleanup of your cache for some reasons (e.g, removing all the cached responses after a database or an API schema change).

> <b>NOTE</b> You might be tempted to do something like `GlobalRouteCache.channel.cache.cleanup()` . This is not advisable as you stand the risk of getting a stale internal state
> <br/>

### 3. **Arguments**

- **func**: `void` - this method takes in no arguments.

### 4. **Example**

```js
// anywhere it makes sense to invoke

await GlobalRouteCache.flushGlobalCache();

//...  rest of your application
```

---

<br/>

### 1. **Name**

`createCacheSubscriber`

### 2. **Description**

This method subscribes the current endpoint into caching and populates the res.local.cachedResponse field to a value of type [CacheSubscriberOpt](#CacheSubscriberOpt) for further processing in your route handler.<br/>Your route will always get the same cached data in the res.local.cachedResponse field of the current route handler unless a corresponding `publisher` (usually an equivalent POST/PUT/PATCH/DELETE handler) is set for that endpoint. So, if you just want a time-based caching for a route, then you should consider using http headers instead for that route.

### 3. **Arguments**

- **opts?**: [CacheSubscriberOpt](#CacheSubscriberOpt) - this is an optional config object to specify the behavior of the current subscription. here are the two types of behaviors you can get based on the these option fields:

  - <b>opts.catchAll</b> : if set to true, the current subscription will behave like a wild card so that whenever a corresponding `publisher` publishes a matching wildcard, the cache is evicted for all routes matching the current route's wildcard (this corresponds to `req.baseUrl` + `req.route.path` in express)<br/> If not set, the current subscription will only be tied to the literal route (`req.baseUrl` + `req.url`). Consequently, a corresponding `publisher` for the current route (whether a 'catchAll' `publisher` or not - so long as it matches) will be able to trigger a cache eviction for it

<br/>

> <b>NOTE</b> the 'catchAll' flag might not always go well with dynamic routes but can be useful in situations where you want to return the same cached data regardless of a params change in the url (e.g /users/1, /users/2, ...), of the current route handler
> <br/>

### 4. **Example**

```js
// in your route handlers
app.get(
  "/users/:user_id",
  GlobalRouteCache.createCacheSubscriber(), // subscribe just this literal route (e.g, /users/2) to caching
  async (req, res) => {
    const { user_id } = req.params;
    // cache hit
    if (res.locals.cachedResponse) {
      // same cached data will be retrieved for any GET request to this route (/users/2)
      // until a publisher publishes to '/users/2' or any matching wildcard (e.g /users/:user_id, /*)
      return res
        .status(res.locals.cachedResponse.statusCode)
        .set(res.locals.cachedResponse.headers)
        .send(res.locals.cachedResponse.body);
    }
    // cache miss
    const user = users[user_id];
    if (user) {
      await delay(DELAY_INTERVAL); // some data fetching logic that is supposed to take time
      res.json(user);
    } else {
      res.status(404).send({ error: "User not found" });
    }
  }
);

//...  rest of your code
```


```js
// in your route handlers
app.get(
  "/users/:user_id",
  GlobalRouteCache.createCacheSubscriber({ catchAll: true }), // this subscription will behave like a wild card (/users/:user_id), subscribing the pattern '/users/:user_id' to caching
  async (req, res) => {
    const { user_id } = req.params;
    // cache hit
    if (res.locals.cachedResponse) {
      // same cached data will be retrieved for *any* GET request to this route (e.g /users/1, /users/2, ...)
      // until a publisher publishes to '/users/:user_id'
      return res
        .status(res.locals.cachedResponse.statusCode)
        .set(res.locals.cachedResponse.headers)
        .send(res.locals.cachedResponse.body);
    }
    // cache miss
    const user = users[user_id];
    if (user) {
      await delay(DELAY_INTERVAL); // some data fetching logic that is supposed to take time
      res.json(user);
    } else {
      res.status(404).send({ error: "User not found" });
    }
  }
);

//...  rest of your code
```

---

<br/>

### 1. **Name**

`createCachePublisher`

### 2. **Description**

This method creates a `publisher` that notifies all the `subscriber`s on the route of the received endpoint to evict their caches.<br/>This is usually called in route handlers that cause mutations (e.g, POST, PUT, DELETE,...).

### 3. **Arguments**

- **opts?**: [CachePublisherOpt](#CachePublisherOpt) - this is an optional config object to specify the behavior of the current `publisher` and optionally cascade the published event to unrelated subscribers. here are the three types of behaviors you can get based on the these option fields:

  - <b>opts.catchAll</b> : if set to true, the current `publisher` will behave like a wild card so that it notifies all `subscriber`s to \*literal\* routes that are matching the current route's wildcard (`req.baseUrl` + `req.url` in express), to evict their caches<br/> If not set, the current `publisher` will only notify the `subscriber` of the literal route (`req.baseUrl` + `req.url`) and consequently, only the literal route's cache is evicted
  - <b>opts.cascade</b> : Additionally, you can provide an array of routes (usually wildcards) to 'cascade' the current published event to. This is basically the `publisher`'s way notifying `subscriber`s that wouldn't have otherwise been notified - `subscriber`s to routes that do not match the current route or the current route's wildcard (depending on `opts.catchAll`)
    <br/>


### 4. **Example**

```js
// in your route handlers
app.post("/users", GlobalRouteCache.createCachePublisher(), (req, res) => { // this publisher will notify all subscribers to '/users' route to evict their caches. Hence the next GET on '/users' will be a cache miss

// ... rest of your route handler logic
});

//...  rest of your code
```


```js
// in your route handlers
app.delete(
  "/users/:user_id",
  GlobalRouteCache.createCachePublisher({ cascade: ["/users"] }), // this won't trigger an eviction for the cache on '/users' unless you explicitly include it in the 'cascade' option field
  // for the simple reason that '/users' does not match '/users/1' (assuming that is the current route)

  // however, the '/users/1' cache is evicted (again, assuming that is the current route)

// ... rest of your route handler logic
);
//...  rest of your code
```


```js
// in your route handlers
app.delete(
  "/users/:user_id",
  GlobalRouteCache.createCachePublisher({ catchAll: true, cascade: ["/users"] }), // similar to the previous example in behavior except 'catchAll' is set to true. Therefore, this publisher will notify all subscribers to literal routes matching '/users/:user_id' route to evict their caches. Hence the next GET on '/users/11', '/users/2', '/users/208', ... will all be cache misses

// ... rest of your route handler logic
);
//...  rest of your code
```
</br>
</br>

# Concepts

- ### glob subscriber
- ### group subscriber
- ### subscriber
- ### publisher
- ### event
</br>
</br>

# Types
</br>
</br>

# Changelog

- ### v1.0.0
  * 1
  ---
  * 2
  ---
  * 3
  ---
- ### v2.0.0
  * 1
  ---
  * 2
  ---
  * 3
  ---
</br>
</br>