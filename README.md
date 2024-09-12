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
export type CachedResponseType = {
  body?: unknown,
  statusCode?: number,
  headers?: {} & Express.Locals,
};

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
  constructor() {}

  deserializer(body: string) {
    // YOUR IMPLEMENTATION
  }

  serializer(body: CachedResponseType) {
    // YOUR IMPLEMENTATION
  }

  async evict(key: string): Promise<void> {
    // YOUR IMPLEMENTATION
  }

  async set(key: string, value: any): Promise<void> {
    // YOUR IMPLEMENTATION
  }

  async get(key: string): Promise<any | undefined> {
    // YOUR IMPLEMENTATION
  }

  async cleanup(): Promise<void> {
    // YOUR IMPLEMENTATION
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

- **arg**: `void` - this method takes in no arguments.

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

This method subscribes the current endpoint into caching and populates the res.local.cachedResponse field with a value of type [CacheSubscriberOpt](#CacheSubscriberOpt) for further processing in your route handlers.<br/>Your route will always get the same cached data in the res.local.cachedResponse field of the current route handler unless a corresponding `publisher` (usually an equivalent POST/PUT/PATCH/DELETE handler) is set for that endpoint. So, if you just want a time-based caching for a route, then you should consider using http headers instead for that route.

### 3. **Arguments**

- **opts?**: [CacheSubscriberOpt](#CacheSubscriberOpt) - this is an optional config object to specify the behavior of the current subscription. here are the two types of behaviors you can get based on the these option fields:

  - <b>opts.catchAll</b> : if set to true, the current subscription will behave like a wild card so that whenever a `publisher` publishes a matching wildcard, the cache is evicted for all routes matching the current route's wildcard (this corresponds to `req.baseUrl` + `req.route.path` in express)<br/> If not set, the current subscription will only be tied to the literal route (`req.baseUrl` + `req.url`). Consequently, a `publisher` for the current route (whether a 'catchAll' `publisher` or not - so long as it matches) will be able to trigger a cache eviction for it

<br/>

> <b>NOTE</b> the 'catchAll' option field might not always go well with dynamic routes but can be useful in situations where you want to return the same cached data regardless of a params change in the url (e.g /users/1, /users/2, ...), of the current route handler
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
  GlobalRouteCache.createCacheSubscriber({ catchAll: true }), // this subscription will behave like a wild card (/users/:user_id), subscribing the literal route '/users/:user_id' to caching
  async (req, res) => {
    const { user_id } = req.params;
    // cache hit
    if (res.locals.cachedResponse) {
      // same cached data will be retrieved for *any* GET request to this route (e.g /users/1, /users/2, ...)
      // until a publisher publishes to '/users/:user_id' or any matching wildcard (e.g /*, /users/*)
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

This method creates a `publisher` that notifies all the `subscriber`s on the route of the received endpoint (or other endpoints, more on that later) to evict their caches.<br/>This is usually called in route handlers that cause mutations (e.g, POST, PUT, DELETE,...).

### 3. **Arguments**

- **opts?**: [CachePublisherOpt](#CachePublisherOpt) - this is an optional config object to specify the behavior of the current `publisher` and optionally cascade the published event to unrelated subscribers. here are the three types of behaviors you can get based on the these option fields:

  - <b>opts.catchAll</b> : If set to true, the current `publisher` will behave like a wild card so that it notifies all `subscriber`s to routes that are matching the current route's wildcard (`req.baseUrl` + `req.url` in express), to evict their caches<br/> If not set, the current `publisher` will only notify the `subscriber` of the literal route (`req.baseUrl` + `req.url`) and consequently, only the literal route's cache is evicted
  - <b>opts.cascade</b> : Additionally, you can provide an array of routes (usually wildcards) to which the current published event is cascaded. This is basically the `publisher`'s way notifying `subscriber`s that wouldn't have otherwise been notified - `subscriber`s to routes that do not match the current route or the current route's wildcard (depending on `opts.catchAll`)
  - <b>opts.freeze</b> : this allows the `publisher` to notify the `subsriber`s to the current route's wildcard without propagating to matching literal routes. this may be useful for optimization purposes
    > <b>NOTE</b> That the 'freeze' option field should be set if and only if the 'catchAll' option field is. Otherwise, the behavior is undefined. Also, this should only be set if you know when to use it. Otherwise, you risk getting a stale cache data - the default configuration is usually sufficient for most cases <br/>

### 4. **Example**

```js
// in your route handlers
app.post("/users", GlobalRouteCache.createCachePublisher(), (req, res) => {
  // this publisher will notify all subscribers to '/users' route to evict their caches. Hence the next GET on '/users' will be a cache miss
  // ... rest of your route handler logic
});

//...  rest of your code
```

- #### With 'cascade' option field

```js
// in your route handlers
app.delete(
  "/users/:user_id",
  GlobalRouteCache.createCachePublisher({ cascade: ["/users"] }) // this won't trigger an eviction for the cache on '/users' unless you explicitly include it in the 'cascade' option field
  // for the simple reason that '/users' does not match '/users/1' (assuming that is the current route)

  // however, the '/users/1' cache is evicted (again, assuming that is the current route)

  // ... rest of your route handler logic
);
//...  rest of your code
```

- #### With 'catchAll' option field

```js
// in your route handlers
app.delete(
  "/users/:user_id",
  GlobalRouteCache.createCachePublisher({ catchAll: true, cascade: ["/users"] }) // similar to the previous example in behavior except 'catchAll' is set to true. Therefore, this publisher will notify all subscribers to literal routes matching '/users/:user_id' route to evict their caches. Hence the next GET on '/users/11', '/users/2', '/users/208', ... will all be cache misses

  // ... rest of your route handler logic
);
//...  rest of your code
```

- #### With 'freeze' option field

```js
// say one of your GET handlers is registering a subscriber with a catchAll option field set to true

app.get(
  "/users/:user_id",
  GlobalRouteCache.createCacheSubscriber({ catchAll: true }) // this subscription will behave like a wild card (/users/:user_id), subscribing the literal route '/users/:user_id' to caching
  /// ...
);

// and you want to trigger the eviction for just that cache somewhere else

app.delete(
  "/users/:user_id",
  GlobalRouteCache.createCachePublisher({ catchAll: true, freeze: true }) //
  // without 'catchAll' set to true, it will only evict the cache of the current literal route (e.g, '/users/1')
  // now, it will be able to evict the cache of all matching routes ('/users/1', '/users/2', ... etc)
  // but wait a minute!, the 'freeze' is set to true. so, it evicts just the cache of '/users/:user_id'
  // which is an exact match of the subscriber previously registered

  // ... rest of your route handler logic
);
//...  rest of your code
```

</br>
</br>

## Additional APIs

- `pub`

  ### **Description**

  Take a look at this example:

  ```js
  // ...
  app.delete(
    "/users/:user_id",
    GlobalRouteCache.createCachePublisher({
      catchAll: true,
      freeze: true,
      cascade: ["/users/:user_id/news/:news_id"],
    })
  );
  // ...
  ```

  Here, the behavior of the cascaded events will depend on whether the freeze option field is set on the original createCachePublisher method (which in this case is)<br/>
  if you want different behaviors for each published event, you should publish them individually using the `GlobalRouteCache.pub`, providing the first and second arguments as the route and a boolean respectively as show below:

  ```js
  // ...
  app.delete(
    "/users/:user_id",
    GlobalRouteCache.createCachePublisher({
      catchAll: true,
      freeze: true,
      cascade: ["/users/:user_id/news/:news_id"],
    }),
    async (req, res, next) => {
      // '/users/:user_id/news/:news_id' will evict its cache but it won't propagate to matching children routes.

      GlobalRouteCache.pub("/users/:user_id/news", false); // the cache eviction will propagate to matching children routes (e.g '/users/1/news', '/users/2/news')

      // ...
    }
  );
  // ...
  ```

  this boolean corresponds to the 'freeze' option field

---

</br>
</br>

# Concepts

- ### glob subscriber
  Subscribes to all [event](#-event)s and tells the `channel` to hold a cache using a global key ("\*"), then evicts the cache whenever an event is produced by any `publisher`.
  <br/>
- ### group subscriber
  Subscribes to a specified group of [event](#-event)s using a wildcard expression (based on the url pattern). it tells the `channel` to hold a cache for this route group - using the url pattern as key, then evicts the cache whenever an event is produced by any `publisher` on routes with wildcard expressions matching its wildcard.
  <br/>
- ### subscriber
  Subscribes to a single [event](#-event) using a literal string expression (based on the url literal). it tells the [channel](#-channel) to hold a cache for this route - using the url literal as key, then evicts the cache whenever an event is produced by its corresponding`publisher`(if any) or any`publisher` on routes with wildcard expressions matching its literal key.
  <br/>
- ### glob publisher
  Produces an [event](#-event) that triggers cache eviction for all subscribers using a "\*" expression
  <br/>
- ### group publisher
  Produces an [event](#-event) that triggers cache eviction for a subset of subscribers using a wild card expression. note that this is not a direct 'flip' of a [group subscriber](#-group-subscriber)
  <br/>
- ### publisher
  Produces an [event](#-event) that triggers cache eviction for a corresponding subscriber (based on the url literal). note that this is not a direct 'flip' of a [subscriber](#-subscriber)
  <br/>
- ### event
  This is an action produced by invoking a `publisher`. It is tied to the url string passed during the registration of the `publisher` - which may or may not be subscribed to by a `subscriber`/`groupSubscriber`.
- ### channel
  This is like a message broker in that it manages the transmission of events from `publisher`s to their corresponding `subscriber`s
  <br/>
  <br/>
  </br>
  </br>

# Types
Work in progress...

</br>
</br>

# Changelog
Work in progress...

- ### v1.0.0
  - 1
  ***
  - 2
  ***
  - 3
  ***
- ### v2.0.0
  - 1
  ***
  - 2
  ***
  - 3
  ***
  </br>
  </br>
