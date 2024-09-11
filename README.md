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
export interface GlobalCacheInterface {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: any) => Promise<void>;
  evict: (key: string) => Promise<void>;
  data?: Map<string, any>;
  deserializer: (body: string) => unknown;
  serializer: (body: unknown) => string;
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

- **func**: `(body: unknown) => string` - A function that takes in whatever your response cache deserializes it into and returns a string.

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

- **func**: `(body: string) => unknown` - A function that takes in a string and returns whatever type your implementation deserializes it into.

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

This method subscribes the current endpoint into caching and populates the res.local.cachedResponse field to a value of type [CachedResponseType](#CachedResponseType) for further processing in your route handler.<br/>Your route will always get the same cached data in the res.local.cachedResponse field of the current route handler unless a corresponding `publisher` (usually an equivalent POST/PUT/PATCH/DELETE handler) is set for that endpoint. So, if you just want a time-based caching, you should consider using http headers instead for this route.

### 3. **Arguments**

- **opts?**: [CachedResponseType](#CachedResponseType) - this is an optional config object to specify the behavior of the current subscription. here are the two types of behaviors you can get based on the these option fields:

  * <b>opts.catchAll</b> : if set, the current subscription will behave like a wild card so that whenever a corresponding `publisher` publishes a matching wildcard, the cache is evicted for all routes matching the current route's wildcard (this corresponds to `req.baseUrl` + `req.route.path` in express)<br/> If not set, the current subscription will only be tied to the literal route (`req.baseUrl` + `req.url`). Consequently, a corresponding `publisher` for this route (whether a 'catchAll' publisher or not - so long as it matches) will be able to trigger a cache eviction for this route

<br/>

> <b>NOTE</b> A parent wildcard publisher...
> <br/>

### 4. **Example**

```js
// in your route handlers

//...

//...  rest of your code
```

---
